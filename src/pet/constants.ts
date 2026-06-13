import type { Size } from "./types";

export const INTERACTION_LAYER_SIZE: Size = {
  width: 520,
  height: 520,
};

export const PET_RENDER_SIZE: Size = {
  width: 180,
  height: 180,
};

export const PET_WINDOW_SIZE = INTERACTION_LAYER_SIZE;

export const PET_BODY_SIZE: Size = {
  width: 132,
  height: 116,
};

export const CAT_CENTER_IN_WINDOW = {
  x: INTERACTION_LAYER_SIZE.width / 2,
  y: INTERACTION_LAYER_SIZE.height / 2,
};

export const LOOK_RADIUS = 250;
export const RUN_RADIUS = 120;
export const MOUSE_REACTION_RADIUS = LOOK_RADIUS;
export const TEASER_HOLD_MS = 2000;
export const SLEEP_AFTER_MS = 30000;
export const STRETCH_AFTER_MS = 10000;
export const RANDOM_STATE_MIN_MS = 2000;
export const RANDOM_STATE_MAX_MS = 5000;
export const WALK_SPEED = 1.8;
export const ROAM_SPEED = 8;
export const RUN_STEP = 18;
export const EXCITED_MOUSE_SPEED = 72;
