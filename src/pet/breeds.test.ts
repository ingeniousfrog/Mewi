import { describe, expect, it } from "vitest";
import { DEFAULT_CAT_BREED, isCatBreed, parseCatBreed } from "./breeds";

describe("cat breeds", () => {
  it("accepts known breed identifiers", () => {
    expect(isCatBreed("blue-longhair")).toBe(true);
    expect(isCatBreed("garfield")).toBe(true);
    expect(isCatBreed("british-shorthair")).toBe(true);
  });

  it("falls back to the default breed for invalid persisted values", () => {
    expect(parseCatBreed("not-a-breed")).toBe(DEFAULT_CAT_BREED);
    expect(parseCatBreed(null)).toBe(DEFAULT_CAT_BREED);
  });
});
