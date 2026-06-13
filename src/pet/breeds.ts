import type { CatBreed } from "./types";

export const DEFAULT_CAT_BREED: CatBreed = "blue-longhair";
export const CAT_BREEDS: readonly CatBreed[] = ["blue-longhair", "garfield", "british-shorthair"];
export const CAT_BREED_STORAGE_KEY = "mewi.catBreed";

export function isCatBreed(value: unknown): value is CatBreed {
  return typeof value === "string" && CAT_BREEDS.includes(value as CatBreed);
}

export function parseCatBreed(value: unknown): CatBreed {
  return isCatBreed(value) ? value : DEFAULT_CAT_BREED;
}
