export type PetState =
  | "idle"
  | "walk"
  | "run"
  | "sleep"
  | "stretch"
  | "look"
  | "drag"
  | "petHead"
  | "explore"
  | "perform"
  | "fish";

export type CursorMode = "default" | "teaser" | "pet";

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
  | "terminal-rest"
  | "pounce"
  | "swat"
  | "hop"
  | "head-rub"
  | "mirror-type"
  | "mirror-drum"
  | "folder-dig"
  | "image-rub"
  | "terminal-pounce"
  | "fishing"
  | "fish-catch";

export type ToyIntensity = "none" | "tease" | "excited";

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
    toyPoint: Point | null;
    toyIntensity: ToyIntensity;
    walkTarget: Point | null;
    exploreTargetId: string | null;
    exploreActionUntilMs: number | null;
    petHeadUntilMs: number | null;
    performUntilMs: number | null;
    fishUntilMs: number | null;
    fishCatchAtMs: number | null;
  }>;
