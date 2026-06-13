import type { ActivityConfig } from "./activity";
import { getActivityConfig, nextRandomDelayMs as activityRandomDelayMs } from "./activity";
import {
  CAT_CENTER_IN_WINDOW,
  ROAM_SPEED,
  STRETCH_AFTER_MS,
  WALK_SPEED,
} from "./constants";
import { clampPointToBounds, distanceBetween, moveToward } from "./motion";
import type {
  CursorMode,
  DesktopObject,
  PetFrame,
  PetState,
  Point,
  Rect,
  Size,
  Velocity,
  VisualAction,
} from "./types";

const RANDOM_STATES: readonly PetState[] = ["idle", "walk", "stretch"];
const EXPLORE_ACTION_MIN_MS = 1500;
const EXPLORE_ACTION_MAX_MS = 3000;
const PET_HEAD_DURATION_MS = 1800;
const PERFORM_DURATION_MS = 2400;

export type PetFrameInput = Readonly<{
  frame: PetFrame;
  bounds: Rect;
  windowSize: Size;
  mouseGlobal: Point | null;
  previousMouseGlobal?: Point | null;
  dragging: boolean;
  headHovered: boolean;
  mouseOverPet: boolean;
  nowMs: number;
  lastInteractionAtMs: number;
  desktopObjects: readonly DesktopObject[];
  randomValue: number;
  forceStateChange?: boolean;
  activityConfig: ActivityConfig;
}>;

export function createInitialPetFrame(position: Point, nowMs = 0, activityConfig = getActivityConfig("lively")): PetFrame {
  return {
    state: "idle",
    position,
    velocity: { x: WALK_SPEED, y: 0 },
    facing: "right",
    cursorMode: "default",
    visualAction: "none",
    nextRandomAtMs: nowMs + activityRandomDelayMs(activityConfig, 0),
    lastNearMouseAtMs: null,
    eyeOffset: { x: 0, y: 0 },
    toyPoint: null,
    toyIntensity: "none",
    walkTarget: null,
    exploreTargetId: null,
    exploreActionUntilMs: null,
    petHeadUntilMs: null,
    performUntilMs: null,
  };
}

export function getCatGlobalCenter(position: Point): Point {
  return {
    x: position.x + CAT_CENTER_IN_WINDOW.x,
    y: position.y + CAT_CENTER_IN_WINDOW.y,
  };
}

export function chooseRandomState(randomValue: number): PetState {
  const index = Math.min(RANDOM_STATES.length - 1, Math.floor(clamp01(randomValue) * RANDOM_STATES.length));
  return RANDOM_STATES[index];
}

export function nextRandomDelayMs(config: ActivityConfig, randomValue: number): number {
  return activityRandomDelayMs(config, randomValue);
}

export function resolveCursorMode(headHovered: boolean): CursorMode {
  return headHovered ? "pet" : "default";
}

export function chooseVisualAction(object: DesktopObject | null, randomValue: number): VisualAction {
  if (!object) {
    return "none";
  }

  const variantsByKind: Record<DesktopObject["kind"], readonly VisualAction[]> = {
    folder: ["sniff", "step", "sit"],
    image: ["rub", "nap-corner"],
    terminal: ["fake-push", "terminal-rest"],
  };
  const variants = variantsByKind[object.kind];
  const index = Math.min(variants.length - 1, Math.floor(clamp01(randomValue) * variants.length));
  return variants[index];
}

export function findNearbyDesktopObject(
  catCenter: Point,
  objects: readonly DesktopObject[],
  radius = 120,
): DesktopObject | null {
  const sorted = objects
    .map((object) => ({
      object,
      distance: distanceBetween(catCenter, rectCenter(object.bounds)),
    }))
    .filter((item) => item.distance <= radius)
    .sort((a, b) => a.distance - b.distance);

  return sorted[0]?.object ?? null;
}

export function nextPetFrame(input: PetFrameInput): PetFrame {
  const frame = normalizeExpiredPerform(input.frame, input.nowMs);
  const catCenter = getCatGlobalCenter(frame.position);
  const cursorMode = input.dragging ? "default" : resolveCursorMode(input.headHovered);
  const eyeOffset =
    input.mouseOverPet && input.mouseGlobal
      ? eyeOffsetForMouse(input.mouseGlobal, catCenter)
      : { x: 0, y: 0 };
  const baseFrame = {
    ...frame,
    cursorMode,
    eyeOffset,
    toyPoint: null,
    toyIntensity: "none" as const,
  };

  if (input.dragging) {
    return {
      ...baseFrame,
      state: "drag",
      visualAction: "none",
      eyeOffset: { x: 0, y: 0 },
      toyPoint: null,
      toyIntensity: "none",
      walkTarget: null,
      exploreTargetId: null,
      exploreActionUntilMs: null,
    };
  }

  if (frame.petHeadUntilMs !== null && input.nowMs < frame.petHeadUntilMs) {
    return {
      ...baseFrame,
      state: "petHead",
      visualAction: "head-rub",
      eyeOffset: { x: 0, y: -2 },
      toyPoint: null,
      toyIntensity: "none",
      walkTarget: null,
      exploreTargetId: null,
      exploreActionUntilMs: null,
      performUntilMs: null,
    };
  }

  if (
    frame.performUntilMs !== null &&
    input.nowMs < frame.performUntilMs &&
    (frame.visualAction === "mirror-type" || frame.visualAction === "mirror-drum")
  ) {
    return {
      ...baseFrame,
      state: "perform",
      walkTarget: null,
      exploreTargetId: null,
      exploreActionUntilMs: null,
      petHeadUntilMs: null,
    };
  }

  if (input.nowMs - input.lastInteractionAtMs >= input.activityConfig.sleepAfterMs) {
    return {
      ...baseFrame,
      state: "sleep",
      visualAction: "none",
      eyeOffset: { x: 0, y: 0 },
      toyPoint: null,
      toyIntensity: "none",
      walkTarget: null,
      exploreTargetId: null,
      exploreActionUntilMs: null,
      petHeadUntilMs: null,
    };
  }

  if (input.frame.exploreActionUntilMs !== null && input.nowMs < input.frame.exploreActionUntilMs) {
    const exploreObject = findDesktopObjectById(frame.exploreTargetId, input.desktopObjects);
    return {
      ...baseFrame,
      state: "idle",
      visualAction: chooseVisualAction(exploreObject, input.randomValue),
      eyeOffset: { x: 0, y: 0 },
      toyPoint: null,
      toyIntensity: "none",
      walkTarget: null,
      petHeadUntilMs: null,
    };
  }

  const clearedExploreFrame: PetFrame = {
    ...baseFrame,
    exploreActionUntilMs: null,
    exploreTargetId:
      input.frame.exploreActionUntilMs !== null && input.nowMs >= input.frame.exploreActionUntilMs
        ? null
        : input.frame.exploreTargetId,
  };

  if (clearedExploreFrame.exploreTargetId) {
    const exploreObject = findDesktopObjectById(clearedExploreFrame.exploreTargetId, input.desktopObjects);

    if (exploreObject) {
      const targetPoint = windowPositionForObject(exploreObject.bounds);
      const motion = nextWalkFrame(
        { ...clearedExploreFrame, walkTarget: clearedExploreFrame.walkTarget ?? targetPoint },
        input.bounds,
        input.windowSize,
        input.randomValue,
        input.activityConfig,
      );
      const reachedTarget = motion.walkTarget === null;

      if (reachedTarget || distanceBetween(motion.position, targetPoint) <= ROAM_SPEED * 2) {
        return {
          ...clearedExploreFrame,
          ...motion,
          state: "idle",
          walkTarget: null,
          exploreActionUntilMs: input.nowMs + nextExploreActionDurationMs(input.randomValue),
          visualAction: chooseVisualAction(exploreObject, input.randomValue),
          eyeOffset: { x: 0, y: 0 },
          toyPoint: null,
          toyIntensity: "none",
          petHeadUntilMs: null,
        };
      }

      return {
        ...clearedExploreFrame,
        ...motion,
        state: "explore",
        visualAction: input.randomValue < input.activityConfig.hopChance ? "hop" : "none",
        eyeOffset: { x: 0, y: 0 },
        toyPoint: null,
        toyIntensity: "none",
        petHeadUntilMs: null,
      };
    }
  }

  const workingFrame =
    clearedExploreFrame.exploreTargetId &&
    !findDesktopObjectById(clearedExploreFrame.exploreTargetId, input.desktopObjects)
      ? { ...clearedExploreFrame, exploreTargetId: null, walkTarget: null }
      : clearedExploreFrame;

  const nearbyObject = findNearbyDesktopObject(
    catCenter,
    input.desktopObjects,
    input.activityConfig.nearbyObjectRadius,
  );
  const nearbyVisualAction = chooseVisualAction(nearbyObject, input.randomValue);
  const shouldRandomize = input.nowMs >= workingFrame.nextRandomAtMs;
  let nextState: PetState = workingFrame.state;
  let nextExploreTargetId = workingFrame.exploreTargetId;
  let nextWalkTarget = workingFrame.walkTarget;

  if (nearbyVisualAction !== "none") {
    nextState = "idle";
  } else if (input.forceStateChange) {
    nextState = "stretch";
  } else if (shouldRandomize) {
    if (input.randomValue < input.activityConfig.exploreChance && input.desktopObjects.length > 0) {
      const exploreObject = chooseExploreTarget(input.desktopObjects, null, input.randomValue);

      if (exploreObject) {
        nextState = "explore";
        nextExploreTargetId = exploreObject.id;
        nextWalkTarget = windowPositionForObject(exploreObject.bounds);
      } else {
        nextState = chooseRandomState(input.randomValue);
      }
    } else {
      nextState = chooseRandomState(input.randomValue);
    }
  }

  const nextRandomAtMs = shouldRandomize
    ? input.nowMs + nextRandomDelayMs(input.activityConfig, input.randomValue)
    : workingFrame.nextRandomAtMs;
  const motion = nextState === "walk" || nextState === "explore"
    ? nextWalkFrame(
        { ...workingFrame, walkTarget: nextWalkTarget },
        input.bounds,
        input.windowSize,
        input.randomValue,
        input.activityConfig,
      )
    : {
        position: workingFrame.position,
        velocity: workingFrame.velocity,
        facing: workingFrame.facing,
        walkTarget: null,
      };
  const moving = nextState === "walk" || nextState === "explore";
  const visualAction = nearbyVisualAction !== "none"
    ? nearbyVisualAction
    : moving && input.randomValue < input.activityConfig.hopChance
      ? "hop"
      : "none";

  return {
    ...workingFrame,
    ...motion,
    state: nextState,
    exploreTargetId: nextExploreTargetId,
    walkTarget: nextState === "explore" ? nextWalkTarget : motion.walkTarget,
    visualAction,
    nextRandomAtMs,
    petHeadUntilMs: null,
  };
}

export function createPerformFrame(frame: PetFrame, nowMs: number, visualAction: "mirror-type" | "mirror-drum"): PetFrame {
  return {
    ...frame,
    state: "perform",
    visualAction,
    performUntilMs: nowMs + PERFORM_DURATION_MS,
    walkTarget: null,
    exploreTargetId: null,
    exploreActionUntilMs: null,
    petHeadUntilMs: null,
    toyPoint: null,
    toyIntensity: "none",
    eyeOffset: { x: 0, y: 0 },
  };
}

export function createPetHeadFrame(frame: PetFrame, nowMs: number): PetFrame {
  return {
    ...frame,
    state: "petHead",
    visualAction: "head-rub",
    petHeadUntilMs: nowMs + PET_HEAD_DURATION_MS,
    performUntilMs: null,
    walkTarget: null,
    exploreTargetId: null,
    exploreActionUntilMs: null,
    toyPoint: null,
    toyIntensity: "none",
    eyeOffset: { x: 0, y: -2 },
  };
}

function normalizeExpiredPerform(frame: PetFrame, nowMs: number): PetFrame {
  if (frame.performUntilMs === null || nowMs < frame.performUntilMs) {
    return frame;
  }

  return {
    ...frame,
    performUntilMs: null,
    state: frame.state === "perform" ? "idle" : frame.state,
    visualAction:
      frame.visualAction === "mirror-type" || frame.visualAction === "mirror-drum"
        ? "none"
        : frame.visualAction,
  };
}

function nextWalkFrame(
  frame: PetFrame,
  bounds: Rect,
  windowSize: Size,
  randomValue: number,
  activityConfig: ActivityConfig,
): Pick<PetFrame, "position" | "velocity" | "facing" | "walkTarget"> {
  const target = frame.walkTarget ?? nextRoamTarget(frame.position, bounds, windowSize, randomValue, activityConfig);
  const nextPosition = clampPointToBounds(moveToward(frame.position, target, ROAM_SPEED, { x: 0, y: 0 }), bounds, windowSize);
  const velocity: Velocity = {
    x: nextPosition.x - frame.position.x,
    y: nextPosition.y - frame.position.y,
  };
  const reachedTarget = distanceBetween(nextPosition, target) <= ROAM_SPEED;

  return {
    position: nextPosition,
    velocity: reachedTarget ? { x: WALK_SPEED, y: 0 } : velocity,
    facing: velocity.x < 0 ? "left" : "right",
    walkTarget: reachedTarget ? null : target,
  };
}

function nextRoamTarget(position: Point, bounds: Rect, windowSize: Size, randomValue: number, activityConfig: ActivityConfig): Point {
  const direction = randomValue < 0.5 ? 1 : -1;
  const span = activityConfig.roamDistanceMax - activityConfig.roamDistanceMin;
  const distance = activityConfig.roamDistanceMin + Math.round(clamp01(randomValue) * span);

  return clampPointToBounds(
    {
      x: position.x + direction * distance,
      y: position.y + Math.round((randomValue - 0.5) * 80),
    },
    bounds,
    windowSize,
  );
}

function chooseExploreTarget(
  objects: readonly DesktopObject[],
  currentId: string | null,
  randomValue: number,
): DesktopObject | null {
  const candidates = currentId ? objects.filter((object) => object.id !== currentId) : objects;

  if (candidates.length === 0) {
    return null;
  }

  const index = Math.min(candidates.length - 1, Math.floor(clamp01(randomValue) * candidates.length));
  return candidates[index] ?? null;
}

function findDesktopObjectById(id: string | null, objects: readonly DesktopObject[]): DesktopObject | null {
  if (!id) {
    return null;
  }

  return objects.find((object) => object.id === id) ?? null;
}

function windowPositionForObject(bounds: Rect): Point {
  const center = rectCenter(bounds);

  return {
    x: center.x - CAT_CENTER_IN_WINDOW.x,
    y: center.y - CAT_CENTER_IN_WINDOW.y,
  };
}

function nextExploreActionDurationMs(randomValue: number): number {
  const span = EXPLORE_ACTION_MAX_MS - EXPLORE_ACTION_MIN_MS;
  return EXPLORE_ACTION_MIN_MS + Math.round(clamp01(randomValue) * span);
}

function eyeOffsetForMouse(mouse: Point, center: Point): Point {
  const dx = mouse.x - center.x;
  const dy = mouse.y - center.y;
  const length = Math.max(1, Math.hypot(dx, dy));

  return {
    x: Math.round((dx / length) * 5),
    y: Math.round((dy / length) * 3),
  };
}

function rectCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export { STRETCH_AFTER_MS, PET_HEAD_DURATION_MS, PERFORM_DURATION_MS };
