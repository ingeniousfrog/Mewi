import {
  MOUSE_REACTION_RADIUS,
  SLEEP_AFTER_MS,
  STRETCH_AFTER_MS,
  WALK_SPEED,
} from "./constants";
import type { PetActivity, PetMotion, PetState, Point, Rect, Size, Velocity } from "./types";

export function clampPointToBounds(point: Point, bounds: Rect, size: Size): Point {
  const maxX = bounds.x + Math.max(0, bounds.width - size.width);
  const maxY = bounds.y + Math.max(0, bounds.height - size.height);

  return {
    x: Math.min(Math.max(point.x, bounds.x), maxX),
    y: Math.min(Math.max(point.y, bounds.y), maxY),
  };
}

export function isMouseNearby(mouse: Point | null, petCenter: Point): boolean {
  if (!mouse) {
    return false;
  }

  const dx = mouse.x - petCenter.x;
  const dy = mouse.y - petCenter.y;
  return Math.hypot(dx, dy) <= MOUSE_REACTION_RADIUS;
}

export function choosePetState(activity: PetActivity): PetState {
  if (activity.dragging) {
    return "drag";
  }

  if (activity.nearbyMouse) {
    return "look";
  }

  if (activity.idleMs >= SLEEP_AFTER_MS) {
    return "sleep";
  }

  if (activity.idleMs >= STRETCH_AFTER_MS) {
    return "stretch";
  }

  return activity.state === "walk" ? "walk" : "idle";
}

export function shouldAutoWalk(state: PetState): boolean {
  return state === "walk";
}

export function nextWalkMotion(motion: PetMotion, bounds: Rect, size: Size): PetMotion {
  const nextPosition = clampPointToBounds(
    {
      x: motion.position.x + motion.velocity.x,
      y: motion.position.y + motion.velocity.y,
    },
    bounds,
    size,
  );

  const hitHorizontalEdge =
    nextPosition.x === bounds.x || nextPosition.x === bounds.x + Math.max(0, bounds.width - size.width);
  const hitVerticalEdge =
    nextPosition.y === bounds.y || nextPosition.y === bounds.y + Math.max(0, bounds.height - size.height);

  const nextVelocity: Velocity = {
    x: hitHorizontalEdge ? -motion.velocity.x || WALK_SPEED : motion.velocity.x,
    y: hitVerticalEdge ? -motion.velocity.y : motion.velocity.y,
  };

  return {
    position: nextPosition,
    velocity: nextVelocity,
    facing: nextVelocity.x < 0 ? "left" : "right",
  };
}
