import { describe, expect, it } from "vitest";
import { getActivityConfig } from "./activity";
import {
  chooseRandomState,
  chooseVisualAction,
  createInitialPetFrame,
  createPetHeadFrame,
  findNearbyDesktopObject,
  nextPetFrame,
  nextRandomDelayMs,
  resolveCursorMode,
} from "./stateMachine";
import { ONBOARDING_WINDOW_SIZE, PET_WINDOW_SIZE } from "./constants";
import type { DesktopObject, PetFrame, Point, Rect } from "./types";

const bounds: Rect = { x: 0, y: 32, width: 1440, height: 820 };
const windowSize = PET_WINDOW_SIZE;
const start = { x: 200, y: 160 };
const center = { x: start.x + 98, y: start.y + 98 };
const livelyConfig = getActivityConfig("lively");
const quietConfig = getActivityConfig("quiet");

function frame(overrides: Partial<PetFrame> = {}): PetFrame {
  return {
    ...createInitialPetFrame(start, 0, livelyConfig),
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
    headHovered: false,
    mouseOverPet: false,
    nowMs: 1000,
    lastInteractionAtMs: 1000,
    desktopObjects: [],
    randomValue: 0,
    activityConfig: livelyConfig,
    ...overrides,
  };
}

describe("pet state machine", () => {
  it("uses the pet cursor when the head is hovered", () => {
    expect(resolveCursorMode(true)).toBe("pet");
    expect(resolveCursorMode(false)).toBe("default");
  });

  it("tracks eye movement only when the cursor is over the pet", () => {
    const result = nextPetFrame(
      input({
        mouseGlobal: { x: center.x + 40, y: center.y },
        mouseOverPet: true,
      }),
    );

    expect(result.eyeOffset.x).toBeGreaterThan(0);
    expect(result.state).toBe("idle");
  });

  it("prioritizes drag over other states", () => {
    const result = nextPetFrame(input({ dragging: true, mouseGlobal: center, mouseOverPet: true }));
    expect(result.state).toBe("drag");
    expect(result.cursorMode).toBe("default");
  });

  it("prioritizes petHead over autonomous behavior", () => {
    const result = nextPetFrame(
      input({
        frame: frame({ petHeadUntilMs: 5000 }),
        nowMs: 2000,
        desktopObjects: [
          {
            id: "folder:Desktop",
            kind: "folder",
            label: "Desktop",
            bounds: { x: center.x - 20, y: center.y - 20, width: 40, height: 40 },
          },
        ],
      }),
    );

    expect(result.state).toBe("petHead");
    expect(result.visualAction).toBe("head-rub");
  });

  it("enters sleep after the activity-specific idle timeout", () => {
    const result = nextPetFrame(
      input({
        activityConfig: quietConfig,
        nowMs: quietConfig.sleepAfterMs + 1,
        lastInteractionAtMs: 0,
      }),
    );

    expect(result.state).toBe("sleep");
  });

  it("randomizes only idle, walk, and stretch within the activity window", () => {
    expect([chooseRandomState(0), chooseRandomState(0.4), chooseRandomState(0.9)]).toEqual([
      "idle",
      "walk",
      "stretch",
    ]);
    expect(nextRandomDelayMs(livelyConfig, 0)).toBe(livelyConfig.randomStateMinMs);
    expect(nextRandomDelayMs(livelyConfig, 1)).toBe(livelyConfig.randomStateMaxMs);
  });

  it("moves toward a short roaming target when walk is selected", () => {
    const result = nextPetFrame(input({ nowMs: 3000, randomValue: 0.4 }));

    expect(result.state).toBe("walk");
    expect(result.position.x).toBeGreaterThan(start.x);
    expect(result.walkTarget).not.toBeNull();
  });

  it("explores desktop objects when activity chance hits", () => {
    const object: DesktopObject = {
      id: "folder:Notes",
      kind: "folder",
      label: "Notes",
      bounds: { x: 800, y: 500, width: 72, height: 72 },
    };
    const result = nextPetFrame(
      input({
        nowMs: 3000,
        randomValue: 0.1,
        desktopObjects: [object],
      }),
    );

    expect(result.state).toBe("explore");
    expect(result.exploreTargetId).toBe(object.id);
    expect(result.walkTarget).not.toBeNull();
  });

  it("stretches on forced view changes when the mouse is not nearby", () => {
    const result = nextPetFrame(input({ forceStateChange: true, randomValue: 0 }));

    expect(result.state).toBe("stretch");
  });

  it("selects desktop visual actions without changing state priority", () => {
    const object: DesktopObject = {
      id: "folder:Desktop",
      kind: "folder",
      label: "Desktop",
      bounds: { x: center.x - 20, y: center.y - 20, width: 40, height: 40 },
    };
    const result = nextPetFrame(input({ desktopObjects: [object], randomValue: 0.8 }));

    expect(findNearbyDesktopObject(center, [object], livelyConfig.nearbyObjectRadius)?.kind).toBe("folder");
    expect(chooseVisualAction(object, 0.8)).toBe("sit");
    expect(result.visualAction).toBe("sit");
  });

  it("extends pet head interactions for a short duration", () => {
    const result = createPetHeadFrame(frame(), 1000);

    expect(result.state).toBe("petHead");
    expect(result.petHeadUntilMs).toBeGreaterThan(1000);
    expect(result.visualAction).toBe("head-rub");
  });

  it("uses the onboarding window size when provided", () => {
    const result = nextPetFrame(
      input({
        windowSize: ONBOARDING_WINDOW_SIZE,
        nowMs: 3000,
        randomValue: 0.4,
      }),
    );

    expect(result.state).toBe("walk");
  });
});
