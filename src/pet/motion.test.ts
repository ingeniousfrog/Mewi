import { describe, expect, it } from "vitest";
import {
  choosePetState,
  clampPointToBounds,
  isMouseNearby,
  nextWalkMotion,
  shouldAutoWalk,
} from "./motion";
import { SLEEP_AFTER_MS, STRETCH_AFTER_MS } from "./constants";

const bounds = { x: 0, y: 0, width: 300, height: 240 };
const size = { width: 100, height: 80 };

describe("pet motion", () => {
  it("clamps a pet window inside screen bounds", () => {
    expect(clampPointToBounds({ x: 280, y: -20 }, bounds, size)).toEqual({ x: 200, y: 0 });
  });

  it("detects a nearby mouse using the reaction radius", () => {
    expect(isMouseNearby({ x: 55, y: 54 }, { x: 0, y: 0 })).toBe(true);
  });

  it("ignores a distant or missing mouse", () => {
    expect(isMouseNearby({ x: 200, y: 200 }, { x: 0, y: 0 })).toBe(false);
    expect(isMouseNearby(null, { x: 0, y: 0 })).toBe(false);
  });

  it("prioritizes drag and look over idle timers", () => {
    expect(
      choosePetState({ state: "sleep", idleMs: SLEEP_AFTER_MS, nearbyMouse: true, dragging: true }),
    ).toBe("drag");
    expect(
      choosePetState({ state: "idle", idleMs: SLEEP_AFTER_MS, nearbyMouse: true, dragging: false }),
    ).toBe("look");
  });

  it("switches from idle to stretch and then sleep over time", () => {
    expect(
      choosePetState({ state: "idle", idleMs: STRETCH_AFTER_MS, nearbyMouse: false, dragging: false }),
    ).toBe("stretch");
    expect(
      choosePetState({ state: "stretch", idleMs: SLEEP_AFTER_MS, nearbyMouse: false, dragging: false }),
    ).toBe("sleep");
  });

  it("only auto-walks while in the walk state", () => {
    expect(shouldAutoWalk("walk")).toBe(true);
    expect(shouldAutoWalk("idle")).toBe(false);
    expect(shouldAutoWalk("sleep")).toBe(false);
    expect(shouldAutoWalk("stretch")).toBe(false);
    expect(shouldAutoWalk("look")).toBe(false);
    expect(shouldAutoWalk("drag")).toBe(false);
  });

  it("walks and reverses direction at screen edges", () => {
    const motion = nextWalkMotion(
      {
        position: { x: 198, y: 80 },
        velocity: { x: 5, y: 0 },
        facing: "right",
      },
      bounds,
      size,
    );

    expect(motion.position).toEqual({ x: 200, y: 80 });
    expect(motion.velocity.x).toBeLessThan(0);
    expect(motion.facing).toBe("left");
  });
});
