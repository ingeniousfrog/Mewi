export type PetState = "idle" | "walk" | "run" | "sleep" | "stretch" | "look" | "drag";

export type CursorMode = "default" | "teaser";

export type CatBreed = "blue-longhair" | "garfield" | "british-shorthair";

export type DesktopObjectKind = "folder" | "image" | "terminal";

export type DesktopObject = Readonly<{
  id: string;
  kind: DesktopObjectKind;
  label: string;
  bounds: Rect;
}>;

export type VisualAction =
  | "none"
  | "sniff"
  | "step"
  | "sit"
  | "rub"
  | "nap-corner"
  | "fake-push"
  | "terminal-rest";

export type Point = Readonly<{
  x: number;
  y: number;
}>;

export type Size = Readonly<{
  width: number;
  height: number;
}>;

export type Rect = Point & Size;

export type Velocity = Point;

export type PetMotion = Readonly<{
  position: Point;
  velocity: Velocity;
  facing: "left" | "right";
}>;

export type PetActivity = Readonly<{
  state: PetState;
  idleMs: number;
  nearbyMouse: boolean;
  dragging: boolean;
}>;

export type PetFrame = PetMotion &
  Readonly<{
    state: PetState;
    cursorMode: CursorMode;
    visualAction: VisualAction;
    nextRandomAtMs: number;
    lastNearMouseAtMs: number | null;
    eyeOffset: Point;
  }>;
