export type PetState = "idle" | "walk" | "sleep" | "stretch" | "look" | "drag";

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
