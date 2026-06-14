import type { Point, Rect, Size } from "./types";
import { clampPointToBounds } from "./motion";

export function centerWindowPosition(bounds: Rect, windowSize: Size): Point {
  return clampPointToBounds(
    {
      x: bounds.x + Math.round((bounds.width - windowSize.width) / 2),
      y: bounds.y + Math.round((bounds.height - windowSize.height) / 2),
    },
    bounds,
    windowSize,
  );
}

export function defaultPetPosition(bounds: Rect, windowSize: Size): Point {
  return clampPointToBounds(
    {
      x: bounds.x + Math.round(bounds.width * 0.5 - windowSize.width / 2),
      y: bounds.y + Math.round(bounds.height * 0.62 - windowSize.height / 2),
    },
    bounds,
    windowSize,
  );
}
