import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDesktopWindowClient } from "../desktop/windowClient";
import { PET_WINDOW_SIZE, WALK_SPEED } from "./constants";
import { clampPointToBounds } from "./motion";
import { createInitialPetFrame, nextPetFrame } from "./stateMachine";
import type { CatBreed, DesktopObject, PetFrame, PetState, Point, Rect, VisualAction } from "./types";

const TICK_MS = 120;
const DESKTOP_SCAN_MS = 2000;
const DEFAULT_BREED: CatBreed = "blue-longhair";
const INITIAL_POSITION: Point = { x: 96, y: 96 };

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
  breed: CatBreed;
  dragging: boolean;
  reset: () => Promise<void>;
  startDrag: (pointer: Point) => Promise<void>;
  moveDrag: (pointer: Point) => Promise<void>;
  endDrag: () => void;
  markInteraction: () => void;
}>;

export function usePetController(): PetController {
  const client = useMemo(() => createDesktopWindowClient(), []);
  const [frame, setFrame] = useState<PetFrame>(() => createInitialPetFrame(INITIAL_POSITION));
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const frameRef = useRef<PetFrame>(frame);
  const lastInteractionAtMsRef = useRef(Date.now());
  const dragSnapshotRef = useRef<DragSnapshot | null>(null);
  const desktopObjectsRef = useRef<readonly DesktopObject[]>([]);
  const forceStateChangeRef = useRef(false);

  const setFrameValue = useCallback((nextFrame: PetFrame) => {
    frameRef.current = nextFrame;
    setFrame(nextFrame);
  }, []);

  const markInteraction = useCallback(() => {
    lastInteractionAtMsRef.current = Date.now();
  }, []);

  const reset = useCallback(async () => {
    const bounds = await client.getBounds();
    const position = clampPointToBounds(
      {
        x: bounds.x + Math.round(bounds.width * 0.18),
        y: bounds.y + Math.round(bounds.height * 0.62),
      },
      bounds,
      PET_WINDOW_SIZE,
    );
    const nextFrame = createInitialPetFrame(position, Date.now());

    await client.setPosition(position);
    setFrameValue(nextFrame);
    setDragging(false);
    draggingRef.current = false;
    lastInteractionAtMsRef.current = Date.now();
    dragSnapshotRef.current = null;
    forceStateChangeRef.current = false;
  }, [client, setFrameValue]);

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
      nextRandomAtMs: Date.now() + 3000,
    });
  }, [markInteraction, setFrameValue]);

  useEffect(() => {
    let removeResetListener: (() => void) | null = null;
    let active = true;

    void reset();

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

    return () => {
      active = false;
      removeResetListener?.();
    };
  }, [client, reset]);

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

      Promise.all([client.getBounds(), client.getCursorPosition()]).then(([bounds, mouseGlobal]) => {
        if (!active) {
          return;
        }

        const nextFrame = nextPetFrame({
          frame: frameRef.current,
          bounds,
          windowSize: PET_WINDOW_SIZE,
          mouseGlobal,
          dragging: draggingRef.current,
          nowMs,
          lastInteractionAtMs: lastInteractionAtMsRef.current,
          desktopObjects: desktopObjectsRef.current,
          randomValue: Math.random(),
          forceStateChange: forceStateChangeRef.current,
        });
        forceStateChangeRef.current = false;

        if (
          nextFrame.position.x !== frameRef.current.position.x ||
          nextFrame.position.y !== frameRef.current.position.y
        ) {
          void client.setPosition(nextFrame.position);
        }

        if (mouseGlobal) {
          const mouseMovedNearCat = nextFrame.cursorMode === "teaser" || nextFrame.state === "run" || nextFrame.state === "look";

          if (mouseMovedNearCat) {
            lastInteractionAtMsRef.current = nowMs;
          }
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
  }, [client, setFrameValue]);

  return {
    state: frame.state,
    facing: frame.facing,
    cursorMode: frame.cursorMode,
    eyeOffset: frame.eyeOffset,
    visualAction: frame.visualAction,
    breed: DEFAULT_BREED,
    dragging,
    reset,
    startDrag,
    moveDrag,
    endDrag,
    markInteraction,
  };
}
