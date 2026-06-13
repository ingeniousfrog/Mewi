import {
  CAT_CENTER_IN_WINDOW,
  LOOK_RADIUS,
  RANDOM_STATE_MAX_MS,
  RANDOM_STATE_MIN_MS,
  RUN_RADIUS,
  RUN_STEP,
  SLEEP_AFTER_MS,
  TEASER_HOLD_MS,
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

export type PetFrameInput = Readonly<{
  frame: PetFrame;
  bounds: Rect;
  windowSize: Size;
  mouseGlobal: Point | null;
  dragging: boolean;
  nowMs: number;
  lastInteractionAtMs: number;
  desktopObjects: readonly DesktopObject[];
  randomValue: number;
  forceStateChange?: boolean;
}>;

export function createInitialPetFrame(position: Point, nowMs = 0): PetFrame {
  return {
    state: "idle",
    position,
    velocity: { x: WALK_SPEED, y: 0 },
    facing: "right",
    cursorMode: "default",
    visualAction: "none",
    nextRandomAtMs: nowMs + RANDOM_STATE_MIN_MS,
    lastNearMouseAtMs: null,
    eyeOffset: { x: 0, y: 0 },
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

export function nextRandomDelayMs(randomValue: number): number {
  const span = RANDOM_STATE_MAX_MS - RANDOM_STATE_MIN_MS;
  return RANDOM_STATE_MIN_MS + Math.round(clamp01(randomValue) * span);
}

export function resolveCursorMode(distanceToMouse: number | null, lastNearMouseAtMs: number | null, nowMs: number): CursorMode {
  if (distanceToMouse !== null && distanceToMouse <= LOOK_RADIUS) {
    return "teaser";
  }

  if (lastNearMouseAtMs !== null && nowMs - lastNearMouseAtMs <= TEASER_HOLD_MS) {
    return "teaser";
  }

  return "default";
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

export function findNearbyDesktopObject(catCenter: Point, objects: readonly DesktopObject[]): DesktopObject | null {
  const sorted = objects
    .map((object) => ({
      object,
      distance: distanceBetween(catCenter, rectCenter(object.bounds)),
    }))
    .filter((item) => item.distance <= 96)
    .sort((a, b) => a.distance - b.distance);

  return sorted[0]?.object ?? null;
}

export function nextPetFrame(input: PetFrameInput): PetFrame {
  const catCenter = getCatGlobalCenter(input.frame.position);
  const distanceToMouse = input.mouseGlobal ? distanceBetween(input.mouseGlobal, catCenter) : null;
  const mouseIsNear = distanceToMouse !== null && distanceToMouse <= LOOK_RADIUS;
  const nextLastNearMouseAtMs = mouseIsNear ? input.nowMs : input.frame.lastNearMouseAtMs;
  const cursorMode = input.dragging
    ? "default"
    : resolveCursorMode(distanceToMouse, nextLastNearMouseAtMs, input.nowMs);

  if (input.dragging) {
    return {
      ...input.frame,
      state: "drag",
      cursorMode,
      visualAction: "none",
      lastNearMouseAtMs: nextLastNearMouseAtMs,
      eyeOffset: { x: 0, y: 0 },
    };
  }

  if (distanceToMouse !== null && distanceToMouse <= RUN_RADIUS && input.mouseGlobal) {
    const position = clampPointToBounds(
      moveToward(input.frame.position, input.mouseGlobal, RUN_STEP, CAT_CENTER_IN_WINDOW),
      input.bounds,
      input.windowSize,
    );
    const velocity = {
      x: position.x - input.frame.position.x,
      y: position.y - input.frame.position.y,
    };

    return {
      ...input.frame,
      state: "run",
      position,
      velocity,
      facing: velocity.x < 0 ? "left" : "right",
      cursorMode,
      visualAction: "none",
      lastNearMouseAtMs: nextLastNearMouseAtMs,
      eyeOffset: eyeOffsetForMouse(input.mouseGlobal, getCatGlobalCenter(position)),
    };
  }

  if (distanceToMouse !== null && distanceToMouse <= LOOK_RADIUS && input.mouseGlobal) {
    return {
      ...input.frame,
      state: "look",
      cursorMode,
      visualAction: "none",
      lastNearMouseAtMs: nextLastNearMouseAtMs,
      eyeOffset: eyeOffsetForMouse(input.mouseGlobal, catCenter),
    };
  }

  if (input.nowMs - input.lastInteractionAtMs >= SLEEP_AFTER_MS) {
    return {
      ...input.frame,
      state: "sleep",
      cursorMode,
      visualAction: "none",
      lastNearMouseAtMs: nextLastNearMouseAtMs,
      eyeOffset: { x: 0, y: 0 },
    };
  }

  const nearbyObject = findNearbyDesktopObject(catCenter, input.desktopObjects);
  const visualAction = chooseVisualAction(nearbyObject, input.randomValue);
  const shouldRandomize = input.nowMs >= input.frame.nextRandomAtMs;
  const nextState =
    visualAction !== "none"
      ? "idle"
      : input.forceStateChange
        ? "stretch"
        : shouldRandomize
          ? chooseRandomState(input.randomValue)
          : input.frame.state;
  const nextRandomAtMs = shouldRandomize ? input.nowMs + nextRandomDelayMs(input.randomValue) : input.frame.nextRandomAtMs;
  const motion = nextState === "walk" ? nextWalkFrame(input.frame, input.bounds, input.windowSize) : input.frame;

  return {
    ...input.frame,
    ...motion,
    state: nextState,
    cursorMode,
    visualAction,
    nextRandomAtMs,
    lastNearMouseAtMs: nextLastNearMouseAtMs,
    eyeOffset: { x: 0, y: 0 },
  };
}

function nextWalkFrame(frame: PetFrame, bounds: Rect, windowSize: Size): Pick<PetFrame, "position" | "velocity" | "facing"> {
  const nextPosition = clampPointToBounds(
    {
      x: frame.position.x + frame.velocity.x,
      y: frame.position.y + frame.velocity.y,
    },
    bounds,
    windowSize,
  );
  const maxX = bounds.x + Math.max(0, bounds.width - windowSize.width);
  const hitHorizontalEdge = nextPosition.x === bounds.x || nextPosition.x === maxX;
  const nextVelocity: Velocity = {
    x: hitHorizontalEdge ? -frame.velocity.x || WALK_SPEED : frame.velocity.x,
    y: frame.velocity.y,
  };

  return {
    position: nextPosition,
    velocity: nextVelocity,
    facing: nextVelocity.x < 0 ? "left" : "right",
  };
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
