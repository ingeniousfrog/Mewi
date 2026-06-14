import { describe, expect, it } from "vitest";
import { ONBOARDING_WINDOW_SIZE, PET_WINDOW_SIZE } from "./constants";
import { centerWindowPosition, defaultPetPosition } from "./placement";

const bounds = { x: 0, y: 32, width: 1440, height: 820 };

describe("pet placement", () => {
  it("centers the onboarding window inside usable bounds", () => {
    expect(centerWindowPosition(bounds, ONBOARDING_WINDOW_SIZE)).toEqual({
      x: 510,
      y: 202,
    });
  });

  it("centers the pet window inside usable bounds", () => {
    expect(centerWindowPosition(bounds, PET_WINDOW_SIZE)).toEqual({
      x: 622,
      y: 344,
    });
  });

  it("places the pet in a centered lower safe spot", () => {
    const position = defaultPetPosition(bounds, PET_WINDOW_SIZE);

    expect(position).toEqual({
      x: 622,
      y: 442,
    });
    expect(position.y).toBeLessThanOrEqual(32 + 820 - PET_WINDOW_SIZE.height);
  });
});
