export type ActivityLevel = "quiet" | "lively" | "hyper";

export type ActivityConfig = Readonly<{
  randomStateMinMs: number;
  randomStateMaxMs: number;
  exploreChance: number;
  roamDistanceMin: number;
  roamDistanceMax: number;
  hopChance: number;
  sleepAfterMs: number;
  nearbyObjectRadius: number;
}>;

export const DEFAULT_ACTIVITY_LEVEL: ActivityLevel = "lively";
export const ACTIVITY_LEVELS: readonly ActivityLevel[] = ["quiet", "lively", "hyper"];
export const ACTIVITY_STORAGE_KEY = "mewi.activityLevel";

const ACTIVITY_CONFIG: Record<ActivityLevel, ActivityConfig> = {
  quiet: {
    randomStateMinMs: 2800,
    randomStateMaxMs: 5500,
    exploreChance: 0.22,
    roamDistanceMin: 88,
    roamDistanceMax: 160,
    hopChance: 0.12,
    sleepAfterMs: 45000,
    nearbyObjectRadius: 128,
  },
  lively: {
    randomStateMinMs: 1400,
    randomStateMaxMs: 2800,
    exploreChance: 0.52,
    roamDistanceMin: 120,
    roamDistanceMax: 220,
    hopChance: 0.28,
    sleepAfterMs: 30000,
    nearbyObjectRadius: 140,
  },
  hyper: {
    randomStateMinMs: 800,
    randomStateMaxMs: 1800,
    exploreChance: 0.72,
    roamDistanceMin: 150,
    roamDistanceMax: 280,
    hopChance: 0.42,
    sleepAfterMs: 20000,
    nearbyObjectRadius: 152,
  },
};

export function isActivityLevel(value: unknown): value is ActivityLevel {
  return typeof value === "string" && ACTIVITY_LEVELS.includes(value as ActivityLevel);
}

export function parseActivityLevel(value: unknown): ActivityLevel {
  return isActivityLevel(value) ? value : DEFAULT_ACTIVITY_LEVEL;
}

export function getActivityConfig(level: ActivityLevel): ActivityConfig {
  return ACTIVITY_CONFIG[level];
}

export function loadStoredActivityLevel(): ActivityLevel {
  if (typeof window === "undefined") {
    return DEFAULT_ACTIVITY_LEVEL;
  }

  return parseActivityLevel(window.localStorage.getItem(ACTIVITY_STORAGE_KEY));
}

export function storeActivityLevel(level: ActivityLevel): void {
  try {
    window.localStorage.setItem(ACTIVITY_STORAGE_KEY, level);
  } catch (error) {
    console.error("Unable to store Mewi activity level", error);
  }
}

export function nextRandomDelayMs(config: ActivityConfig, randomValue: number): number {
  const span = config.randomStateMaxMs - config.randomStateMinMs;
  return config.randomStateMinMs + Math.round(clamp01(randomValue) * span);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
