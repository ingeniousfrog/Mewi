import { describe, expect, it } from "vitest";
import {
  chooseRandomState,
  chooseVisualAction,
  createInitialPetFrame,
  findNearbyDesktopObject,
  nextPetFrame,
  nextRandomDelayMs,
  resolveCursorMode,
} from "./stateMachine";
import { LOOK_RADIUS, RANDOM_STATE_MAX_MS, RANDOM_STATE_MIN_MS, RUN_RADIUS, SLEEP_AFTER_MS, TEASER_HOLD_MS } from "./constants";
import type { DesktopObject, PetFrame, Point, Rect } from "./types";

const bounds: Rect = { x: 0, y: 0, width: 1200, height: 900 };
const windowSize = { width: 520, height: 520 };
const start = { x: 200, y: 160 };
const center = { x: 460, y: 420 };

function frame(overrides: Partial<PetFrame> = {}): PetFrame {
  return {
    ...createInitialPetFrame(start, 0),
    ...overrides,
  };
}

function input(overrides: Partial<Parameters<typeof nextPetFrame>[0]> = {}) {
  return {
    frame: frame(),
    bounds,
    windowSize,
    mouseGlobal: null,
    dragging: false,
    nowMs: 1000,
    lastInteractionAtMs: 1000,
    desktopObjects: [],
    randomValue: 0,
    ...overrides,
  };
}

describe("pet state machine", () => {
  it("enters look within 250px and run within 120px", () => {
    expect(nextPetFrame(input({ mouseGlobal: pointAtDistance(LOOK_RADIUS - 4) })).state).toBe("look");
    expect(nextPetFrame(input({ mouseGlobal: pointAtDistance(RUN_RADIUS - 4) })).state).toBe("run");
  });

  it("keeps teaser cursor for two seconds after the mouse leaves", () => {
    expect(resolveCursorMode(null, 1000, 1000 + TEASER_HOLD_MS - 1)).toBe("teaser");
    expect(resolveCursorMode(null, 1000, 1000 + TEASER_HOLD_MS + 1)).toBe("default");
  });

  it("hides the visible toy while only the cursor delay is active", () => {
    const result = nextPetFrame(input({ frame: frame({ lastNearMouseAtMs: 1000 }), nowMs: 1000 + TEASER_HOLD_MS - 1 }));

    expect(result.cursorMode).toBe("teaser");
    expect(result.toyPoint).toBeNull();
  });

  it("prioritizes drag over teaser and mouse states", () => {
    const result = nextPetFrame(input({ dragging: true, mouseGlobal: pointAtDistance(20) }));
    expect(result.state).toBe("drag");
    expect(result.cursorMode).toBe("default");
  });

  it("enters sleep after thirty seconds without interaction", () => {
    const result = nextPetFrame(input({ nowMs: SLEEP_AFTER_MS + 1, lastInteractionAtMs: 0 }));
    expect(result.state).toBe("sleep");
  });

  it("randomizes only idle, walk, and stretch within a two to five second window", () => {
    expect([chooseRandomState(0), chooseRandomState(0.4), chooseRandomState(0.9)]).toEqual([
      "idle",
      "walk",
      "stretch",
    ]);
    expect(nextRandomDelayMs(0)).toBe(RANDOM_STATE_MIN_MS);
    expect(nextRandomDelayMs(1)).toBe(RANDOM_STATE_MAX_MS);
  });

  it("moves toward a short roaming target when walk is selected", () => {
    const result = nextPetFrame(input({ nowMs: 3000, randomValue: 0.4 }));

    expect(result.state).toBe("walk");
    expect(result.position.x).toBeGreaterThan(start.x);
    expect(result.walkTarget).not.toBeNull();
  });

  it("outputs a visible teaser toy while the mouse is nearby", () => {
    const result = nextPetFrame(input({ mouseGlobal: pointAtDistance(LOOK_RADIUS - 4) }));

    expect(result.state).toBe("look");
    expect(result.cursorMode).toBe("teaser");
    expect(result.toyPoint).toEqual({ x: LOOK_RADIUS - 4 + 260, y: 260 });
    expect(result.toyIntensity).toBe("tease");
  });

  it("gets excited and pounces when the mouse is close", () => {
    const result = nextPetFrame(input({ mouseGlobal: pointAtDistance(RUN_RADIUS - 4), randomValue: 0.2 }));

    expect(result.state).toBe("run");
    expect(result.toyIntensity).toBe("excited");
    expect(result.visualAction).toBe("pounce");
  });

  it("gets excited and swats when the mouse moves quickly inside the teaser range", () => {
    const result = nextPetFrame(
      input({
        mouseGlobal: pointAtDistance(180),
        previousMouseGlobal: pointAtDistance(80),
        randomValue: 0.9,
      }),
    );

    expect(result.state).toBe("look");
    expect(result.toyIntensity).toBe("excited");
    expect(result.visualAction).toBe("swat");
  });

  it("stretches on forced view changes when the mouse is not nearby", () => {
    const result = nextPetFrame(input({ forceStateChange: true, randomValue: 0 }));

    expect(result.state).toBe("stretch");
  });

  it("keeps run movement inside screen bounds", () => {
    const result = nextPetFrame(
      input({
        frame: frame({ position: { x: 680, y: 380 } }),
        mouseGlobal: { x: 1000, y: 700 },
      }),
    );

    expect(result.state).toBe("run");
    expect(result.position.x).toBeLessThanOrEqual(bounds.width - windowSize.width);
    expect(result.position.y).toBeLessThanOrEqual(bounds.height - windowSize.height);
  });

  it("selects desktop visual actions without changing state priority", () => {
    const object: DesktopObject = {
      id: "folder:Desktop",
      kind: "folder",
      label: "Desktop",
      bounds: { x: center.x - 20, y: center.y - 20, width: 40, height: 40 },
    };
    const result = nextPetFrame(input({ desktopObjects: [object], randomValue: 0.8 }));

    expect(findNearbyDesktopObject(center, [object])?.kind).toBe("folder");
    expect(chooseVisualAction(object, 0.8)).toBe("sit");
    expect(result.visualAction).toBe("sit");
  });
});

function pointAtDistance(distance: number): Point {
  return { x: center.x + distance, y: center.y };
}
