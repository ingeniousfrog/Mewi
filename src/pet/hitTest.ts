import { CAT_CENTER_IN_WINDOW, PET_RENDER_SIZE } from "./constants";
import type { Point } from "./types";

const HIT_PADDING = 4;

export function getPetHitRect(): Readonly<{ x: number; y: number; width: number; height: number }> {
  return {
    x: CAT_CENTER_IN_WINDOW.x - PET_RENDER_SIZE.width / 2 - HIT_PADDING,
    y: CAT_CENTER_IN_WINDOW.y - PET_RENDER_SIZE.height / 2 - HIT_PADDING,
    width: PET_RENDER_SIZE.width + HIT_PADDING * 2,
    height: PET_RENDER_SIZE.height + HIT_PADDING * 2,
  };
}

export function isCursorOverPet(localPoint: Point | null): boolean {
  if (!localPoint) {
    return false;
  }

  const rect = getPetHitRect();

  return (
    localPoint.x >= rect.x &&
    localPoint.x <= rect.x + rect.width &&
    localPoint.y >= rect.y &&
    localPoint.y <= rect.y + rect.height
  );
}

export function toWindowLocalPoint(globalPoint: Point, windowPosition: Point): Point {
  return {
    x: globalPoint.x - windowPosition.x,
    y: globalPoint.y - windowPosition.y,
  };
}
