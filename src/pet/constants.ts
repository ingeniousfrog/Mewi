import type { Size } from "./types";

export const PET_WINDOW_SIZE: Size = {
  width: 196,
  height: 196,
};

export const ONBOARDING_WINDOW_SIZE: Size = {
  width: 420,
  height: 480,
};

export const INTERACTION_LAYER_SIZE = PET_WINDOW_SIZE;

export const PET_RENDER_SIZE: Size = {
  width: 168,
  height: 168,
};

export const PET_BODY_SIZE: Size = {
  width: 132,
  height: 116,
};

export const CAT_CENTER_IN_WINDOW = {
  x: PET_WINDOW_SIZE.width / 2,
  y: PET_WINDOW_SIZE.height / 2,
};

export const SLEEP_AFTER_MS = 30000;
export const STRETCH_AFTER_MS = 10000;
export const RANDOM_STATE_MIN_MS = 2000;
export const RANDOM_STATE_MAX_MS = 5000;
export const WALK_SPEED = 1.8;
export const ROAM_SPEED = 8;
export const RUN_STEP = 18;
export const EXCITED_MOUSE_SPEED = 72;
