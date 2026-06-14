import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDesktopWindowClient } from "../desktop/windowClient";
import {
  getActivityConfig,
  loadStoredActivityLevel,
  parseActivityLevel,
  storeActivityLevel,
  type ActivityLevel,
} from "./activity";
import { isMuted, playDrumBeat, playFishCatch, playFishSplash, playHappyMeow, playPurr, playTypeTap, setMuted } from "./audio";
import { isCursorOverPet, toWindowLocalPoint } from "./hitTest";
import { isOnboardingComplete, type PermissionStatus } from "./onboarding";
import { ONBOARDING_WINDOW_SIZE, PET_WINDOW_SIZE, WALK_SPEED } from "./constants";
import { clampPointToBounds } from "./motion";
import { centerWindowPosition, defaultPetPosition } from "./placement";
import { createInitialPetFrame, createPerformFrame, createPetHeadFrame, nextPetFrame } from "./stateMachine";
import { CAT_BREED_STORAGE_KEY, DEFAULT_CAT_BREED, parseCatBreed } from "./breeds";
import type { CatBreed, DesktopObject, PetFrame, PetState, Point, Rect, ToyIntensity, VisualAction } from "./types";

const TICK_MS = 120;
const DESKTOP_SCAN_MS = 2000;

type DragSnapshot = Readonly<{
  offset: Point;
  bounds: Rect;
}>;

export type PetController = Readonly<{
  state: PetState;
  facing: "left" | "right";
  cursorMode: PetFrame["cursorMode"];
  eyeOffset: Point;
  visualAction: VisualAction;
  toyPoint: Point | null;
  toyIntensity: ToyIntensity;
  breed: CatBreed;
  activityLevel: ActivityLevel;
  dragging: boolean;
  reset: () => Promise<void>;
  setBreed: (breed: CatBreed) => void;
  setActivityLevel: (level: ActivityLevel) => void;
  setHeadHovered: (hovered: boolean) => void;
  startDrag: (pointer: Point) => Promise<void>;
  moveDrag: (pointer: Point) => Promise<void>;
  endDrag: () => void;
  petHead: () => void;
  markInteraction: () => void;
  showOnboarding: boolean;
  completeOnboarding: () => void;
  requestDesktopAccess: () => Promise<PermissionStatus>;
  requestInputAccess: () => Promise<PermissionStatus>;
}>;

export function usePetController(): PetController {
  const client = useMemo(() => createDesktopWindowClient(), []);
  const [activityLevel, setActivityLevelState] = useState<ActivityLevel>(() => loadStoredActivityLevel());
  const activityConfig = useMemo(() => getActivityConfig(activityLevel), [activityLevel]);
  const [frame, setFrame] = useState<PetFrame>(() => createInitialPetFrame({ x: 0, y: 0 }, 0, activityConfig));
  const [breed, setBreedState] = useState<CatBreed>(() => loadStoredBreed());
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingComplete());
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const frameRef = useRef<PetFrame>(frame);
  const lastInteractionAtMsRef = useRef(Date.now());
  const dragSnapshotRef = useRef<DragSnapshot | null>(null);
  const desktopObjectsRef = useRef<readonly DesktopObject[]>([]);
  const forceStateChangeRef = useRef(false);
  const previousMouseGlobalRef = useRef<Point | null>(null);
  const headHoveredRef = useRef(false);
  const showOnboardingRef = useRef(showOnboarding);
  const lastKeyMirrorAtMsRef = useRef(0);
  const lastClickMirrorAtMsRef = useRef(0);

  useEffect(() => {
    showOnboardingRef.current = showOnboarding;
  }, [showOnboarding]);

  const setFrameValue = useCallback((nextFrame: PetFrame) => {
    frameRef.current = nextFrame;
    setFrame(nextFrame);
  }, []);

  const markInteraction = useCallback(() => {
    lastInteractionAtMsRef.current = Date.now();
  }, []);

  const setBreed = useCallback(
    (nextBreed: CatBreed) => {
      setBreedState(nextBreed);
      storeBreed(nextBreed);
      client.setTrayBreed(nextBreed).catch((error: unknown) => {
        console.error("Unable to sync Mewi breed menu", error);
      });
    },
    [client],
  );

  const setActivityLevel = useCallback(
    (level: ActivityLevel) => {
      setActivityLevelState(level);
      storeActivityLevel(level);
      client.setTrayActivity(level).catch((error: unknown) => {
        console.error("Unable to sync Mewi activity menu", error);
      });
    },
    [client],
  );

  const setHeadHovered = useCallback((hovered: boolean) => {
    headHoveredRef.current = hovered;
  }, []);

  const reset = useCallback(async () => {
    const bounds = await client.getBounds();
    await client.setSize(PET_WINDOW_SIZE);
    const position = defaultPetPosition(bounds, PET_WINDOW_SIZE);
    const nextFrame = createInitialPetFrame(position, Date.now(), activityConfig);

    await client.setPosition(position);
    setFrameValue(nextFrame);
    setDragging(false);
    draggingRef.current = false;
    lastInteractionAtMsRef.current = Date.now();
    dragSnapshotRef.current = null;
    forceStateChangeRef.current = false;
    previousMouseGlobalRef.current = null;
  }, [activityConfig, client, setFrameValue]);

  const centerForOnboarding = useCallback(async () => {
    const bounds = await client.getBounds();
    await client.setSize(ONBOARDING_WINDOW_SIZE);
    const position = centerWindowPosition(bounds, ONBOARDING_WINDOW_SIZE);
    const nextFrame = createInitialPetFrame(position, Date.now(), activityConfig);

    await client.setPosition(position);
    setFrameValue(nextFrame);
    draggingRef.current = false;
    setDragging(false);
    dragSnapshotRef.current = null;
    await client.setIgnoreCursorEvents(false);
  }, [activityConfig, client, setFrameValue]);

  const placePetAtDefault = useCallback(async () => {
    const bounds = await client.getBounds();
    await client.setSize(PET_WINDOW_SIZE);
    const position = defaultPetPosition(bounds, PET_WINDOW_SIZE);
    const nextFrame = {
      ...frameRef.current,
      ...createInitialPetFrame(position, Date.now(), activityConfig),
    };

    await client.setPosition(position);
    setFrameValue(nextFrame);
    await client.setIgnoreCursorEvents(false);
  }, [activityConfig, client, setFrameValue]);

  const startDrag = useCallback(
    async (pointer: Point) => {
      const [position, bounds] = await Promise.all([client.getPosition(), client.getBounds()]);
      dragSnapshotRef.current = {
        offset: {
          x: pointer.x - position.x,
          y: pointer.y - position.y,
        },
        bounds,
      };
      draggingRef.current = true;
      setDragging(true);
      markInteraction();
      setFrameValue({
        ...frameRef.current,
        state: "drag",
        cursorMode: "default",
        visualAction: "none",
        toyPoint: null,
        toyIntensity: "none",
        walkTarget: null,
        exploreTargetId: null,
        exploreActionUntilMs: null,
        petHeadUntilMs: null,
        fishUntilMs: null,
        fishCatchAtMs: null,
        velocity: { x: WALK_SPEED, y: 0 },
      });
    },
    [client, markInteraction, setFrameValue],
  );

  const moveDrag = useCallback(
    async (pointer: Point) => {
      const snapshot = dragSnapshotRef.current;

      if (!snapshot) {
        return;
      }

      const position = clampPointToBounds(
        {
          x: pointer.x - snapshot.offset.x,
          y: pointer.y - snapshot.offset.y,
        },
        snapshot.bounds,
        PET_WINDOW_SIZE,
      );
      const nextFrame = {
        ...frameRef.current,
        state: "drag" as const,
        position,
        cursorMode: "default" as const,
        visualAction: "none" as const,
        toyPoint: null,
        toyIntensity: "none" as const,
        walkTarget: null,
        exploreTargetId: null,
        exploreActionUntilMs: null,
        petHeadUntilMs: null,
        fishUntilMs: null,
        fishCatchAtMs: null,
      };

      await client.setPosition(position);
      setFrameValue(nextFrame);
      markInteraction();
    },
    [client, markInteraction, setFrameValue],
  );

  const endDrag = useCallback(() => {
    dragSnapshotRef.current = null;
    draggingRef.current = false;
    setDragging(false);
    markInteraction();
    setFrameValue({
      ...frameRef.current,
      state: "idle",
      cursorMode: "default",
      visualAction: "none",
      toyPoint: null,
      toyIntensity: "none",
      walkTarget: null,
      exploreTargetId: null,
      exploreActionUntilMs: null,
      petHeadUntilMs: null,
      fishUntilMs: null,
      fishCatchAtMs: null,
      nextRandomAtMs: Date.now() + 3000,
    });
  }, [markInteraction, setFrameValue]);

  const petHead = useCallback(() => {
    markInteraction();
    const nowMs = Date.now();
    setFrameValue(createPetHeadFrame(frameRef.current, nowMs));
  }, [markInteraction, setFrameValue]);

  const completeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    void placePetAtDefault();
  }, [placePetAtDefault]);

  const requestDesktopAccess = useCallback(async () => {
    const status = await client.requestDesktopAccess();
    desktopObjectsRef.current = await client.scanDesktopEnvironment().catch(() => []);
    return status;
  }, [client]);

  const requestInputAccess = useCallback(async () => {
    return client.requestInputAccess();
  }, [client]);

  const triggerMirrorPerform = useCallback(
    (visualAction: "mirror-type" | "mirror-drum") => {
      const current = frameRef.current;
      const nowMs = Date.now();

      if (draggingRef.current || current.state === "drag" || current.state === "petHead") {
        return;
      }

      if (current.performUntilMs !== null && nowMs < current.performUntilMs && current.visualAction === visualAction) {
        setFrameValue(createPerformFrame(current, nowMs, visualAction));
        return;
      }

      if (current.performUntilMs !== null && nowMs < current.performUntilMs) {
        return;
      }

      markInteraction();
      setFrameValue(createPerformFrame(current, nowMs, visualAction));

      if (visualAction === "mirror-type") {
        playTypeTap();
      } else {
        playDrumBeat();
      }
    },
    [markInteraction, setFrameValue],
  );

  useEffect(() => {
    let removeResetListener: (() => void) | null = null;
    let removeBringBackListener: (() => void) | null = null;
    let removeBreedListener: (() => void) | null = null;
    let removeActivityListener: (() => void) | null = null;
    let removeMuteListener: (() => void) | null = null;
    let removeDesktopListener: (() => void) | null = null;
    let removeKeyListener: (() => void) | null = null;
    let removeClickListener: (() => void) | null = null;
    let active = true;

    if (showOnboardingRef.current) {
      void centerForOnboarding();
    } else {
      void reset();
    }

    client.onReset(() => {
      void reset();
    }).then((unlisten) => {
      if (active) {
        removeResetListener = unlisten;
        return;
      }

      unlisten();
    }).catch((error: unknown) => {
      console.error("Unable to attach Mewi reset listener", error);
    });

    client.onBringBack(() => {
      void reset();
    }).then((unlisten) => {
      if (active) {
        removeBringBackListener = unlisten;
        return;
      }

      unlisten();
    }).catch((error: unknown) => {
      console.error("Unable to attach Mewi bring-back listener", error);
    });

    client.onBreedChange((payload) => {
      setBreed(parseCatBreed(payload));
    }).then((unlisten) => {
      if (active) {
        removeBreedListener = unlisten;
        return;
      }

      unlisten();
    }).catch((error: unknown) => {
      console.error("Unable to attach Mewi breed listener", error);
    });

    client.onActivityChange((payload) => {
      setActivityLevel(parseActivityLevel(payload));
    }).then((unlisten) => {
      if (active) {
        removeActivityListener = unlisten;
        return;
      }

      unlisten();
    }).catch((error: unknown) => {
      console.error("Unable to attach Mewi activity listener", error);
    });

    client.onMuteChange((payload) => {
      setMuted(Boolean(payload));
    }).then((unlisten) => {
      if (active) {
        removeMuteListener = unlisten;
        return;
      }

      unlisten();
    }).catch((error: unknown) => {
      console.error("Unable to attach Mewi mute listener", error);
    });

    client.onDesktopChanged(() => {
      client.scanDesktopEnvironment().then((objects) => {
        desktopObjectsRef.current = objects;
      }).catch((error: unknown) => {
        desktopObjectsRef.current = [];
        console.error("Unable to rescan desktop environment", error);
      });
    }).then((unlisten) => {
      if (active) {
        removeDesktopListener = unlisten;
        return;
      }

      unlisten();
    }).catch((error: unknown) => {
      console.error("Unable to attach Mewi desktop listener", error);
    });

    client.onUserKeyActivity(() => {
      const nowMs = Date.now();

      if (nowMs - lastKeyMirrorAtMsRef.current < 180) {
        return;
      }

      lastKeyMirrorAtMsRef.current = nowMs;
      triggerMirrorPerform("mirror-type");
    }).then((unlisten) => {
      if (active) {
        removeKeyListener = unlisten;
        return;
      }

      unlisten();
    }).catch((error: unknown) => {
      console.error("Unable to attach Mewi key listener", error);
    });

    client.onUserClickActivity(() => {
      const nowMs = Date.now();

      if (nowMs - lastClickMirrorAtMsRef.current < 220) {
        return;
      }

      lastClickMirrorAtMsRef.current = nowMs;
      triggerMirrorPerform("mirror-drum");
    }).then((unlisten) => {
      if (active) {
        removeClickListener = unlisten;
        return;
      }

      unlisten();
    }).catch((error: unknown) => {
      console.error("Unable to attach Mewi click listener", error);
    });

    return () => {
      active = false;
      removeResetListener?.();
      removeBringBackListener?.();
      removeBreedListener?.();
      removeActivityListener?.();
      removeMuteListener?.();
      removeDesktopListener?.();
      removeKeyListener?.();
      removeClickListener?.();
    };
  }, [centerForOnboarding, client, reset, setActivityLevel, setBreed, triggerMirrorPerform]);

  useEffect(() => {
    client.setTrayBreed(breed).catch((error: unknown) => {
      console.error("Unable to sync Mewi breed menu", error);
    });
  }, [breed, client]);

  useEffect(() => {
    client.setTrayActivity(activityLevel).catch((error: unknown) => {
      console.error("Unable to sync Mewi activity menu", error);
    });
  }, [activityLevel, client]);

  useEffect(() => {
    client.setTrayMute(isMuted()).catch((error: unknown) => {
      console.error("Unable to sync Mewi mute menu", error);
    });
  }, [client]);

  useEffect(() => {
    const scan = () => {
      client.scanDesktopEnvironment().then((objects) => {
        desktopObjectsRef.current = objects;
      }).catch((error: unknown) => {
        desktopObjectsRef.current = [];
        console.error("Unable to scan desktop environment", error);
      });
    };
    const interval = window.setInterval(scan, DESKTOP_SCAN_MS);

    scan();

    return () => window.clearInterval(interval);
  }, [client]);

  useEffect(() => {
    const triggerStateChange = () => {
      forceStateChangeRef.current = true;
      markInteraction();
    };

    document.addEventListener("visibilitychange", triggerStateChange);
    window.addEventListener("focus", triggerStateChange);
    window.addEventListener("blur", triggerStateChange);

    return () => {
      document.removeEventListener("visibilitychange", triggerStateChange);
      window.removeEventListener("focus", triggerStateChange);
      window.removeEventListener("blur", triggerStateChange);
    };
  }, [markInteraction]);

  useEffect(() => {
    let active = true;
    const interval = window.setInterval(() => {
      const nowMs = Date.now();
      const windowSize = showOnboardingRef.current ? ONBOARDING_WINDOW_SIZE : PET_WINDOW_SIZE;

      Promise.all([client.getBounds(), client.getCursorPosition(), client.getPosition()]).then(([bounds, mouseGlobal, windowPosition]) => {
        if (!active) {
          return;
        }

        const localCursor = mouseGlobal ? toWindowLocalPoint(mouseGlobal, windowPosition) : null;
        const mouseOverPet = !showOnboardingRef.current && isCursorOverPet(localCursor);
        const previousFrame = frameRef.current;
        const nextFrame = nextPetFrame({
          frame: previousFrame,
          bounds,
          windowSize,
          mouseGlobal,
          previousMouseGlobal: previousMouseGlobalRef.current,
          dragging: draggingRef.current,
          headHovered: headHoveredRef.current,
          mouseOverPet,
          nowMs,
          lastInteractionAtMs: lastInteractionAtMsRef.current,
          desktopObjects: desktopObjectsRef.current,
          randomValue: Math.random(),
          forceStateChange: forceStateChangeRef.current,
          activityConfig,
        });
        forceStateChangeRef.current = false;
        previousMouseGlobalRef.current = mouseGlobal;

        if (nextFrame.state === "petHead" && previousFrame.state !== "petHead") {
          playPurr();
        }

        if (nextFrame.state === "fish" && previousFrame.state !== "fish") {
          playFishSplash();
        }

        if (
          nextFrame.visualAction === "fish-catch" &&
          previousFrame.visualAction !== "fish-catch"
        ) {
          playFishCatch();
        }

        if (
          nextFrame.exploreActionUntilMs !== null &&
          previousFrame.exploreActionUntilMs === null
        ) {
          const exploreObject = desktopObjectsRef.current.find((object) => object.id === nextFrame.exploreTargetId);

          if (exploreObject?.kind === "folder" && Math.random() < 0.35) {
            playHappyMeow();
          }
        }

        if (
          nextFrame.position.x !== previousFrame.position.x ||
          nextFrame.position.y !== previousFrame.position.y
        ) {
          void client.setPosition(nextFrame.position);
        }

        if (mouseOverPet) {
          lastInteractionAtMsRef.current = nowMs;
        }

        setFrameValue(nextFrame);
      }).catch((error: unknown) => {
        console.error("Unable to update Mewi frame", error);
      });
    }, TICK_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [activityConfig, client, setFrameValue]);

  return {
    state: frame.state,
    facing: frame.facing,
    cursorMode: frame.cursorMode,
    eyeOffset: frame.eyeOffset,
    visualAction: frame.visualAction,
    toyPoint: frame.toyPoint,
    toyIntensity: frame.toyIntensity,
    breed,
    activityLevel,
    dragging,
    reset,
    setBreed,
    setActivityLevel,
    setHeadHovered,
    startDrag,
    moveDrag,
    endDrag,
    petHead,
    markInteraction,
    showOnboarding,
    completeOnboarding,
    requestDesktopAccess,
    requestInputAccess,
  };
}

function loadStoredBreed(): CatBreed {
  if (typeof window === "undefined") {
    return DEFAULT_CAT_BREED;
  }

  return parseCatBreed(window.localStorage.getItem(CAT_BREED_STORAGE_KEY));
}

function storeBreed(breed: CatBreed): void {
  try {
    window.localStorage.setItem(CAT_BREED_STORAGE_KEY, breed);
  } catch (error) {
    console.error("Unable to store Mewi breed", error);
  }
}
