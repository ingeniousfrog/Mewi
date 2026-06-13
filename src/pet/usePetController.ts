import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDesktopWindowClient } from "../desktop/windowClient";
import { PET_WINDOW_SIZE, WALK_SPEED } from "./constants";
import { choosePetState, clampPointToBounds, isMouseNearby, nextWalkMotion, shouldAutoWalk } from "./motion";
import type { PetMotion, PetState, Point, Rect } from "./types";

const TICK_MS = 120;
const WALK_EVERY_TICK = 4;
const DEFAULT_BOUNDS: Rect = { x: 0, y: 0, width: 800, height: 600 };
const INITIAL_MOTION: PetMotion = {
  position: { x: 96, y: 96 },
  velocity: { x: WALK_SPEED, y: 0 },
  facing: "right",
};

type DragSnapshot = Readonly<{
  offset: Point;
  bounds: Rect;
}>;

export type PetController = Readonly<{
  state: PetState;
  facing: "left" | "right";
  nearbyMouse: boolean;
  dragging: boolean;
  reset: () => Promise<void>;
  setMousePoint: (point: Point | null) => void;
  startDrag: (pointer: Point) => Promise<void>;
  moveDrag: (pointer: Point) => Promise<void>;
  endDrag: () => void;
}>;

export function usePetController(): PetController {
  const client = useMemo(() => createDesktopWindowClient(), []);
  const [motion, setMotion] = useState<PetMotion>(INITIAL_MOTION);
  const [state, setState] = useState<PetState>("idle");
  const [nearbyMouse, setNearbyMouse] = useState(false);
  const [dragging, setDragging] = useState(false);
  const stateRef = useRef<PetState>("idle");
  const idleMsRef = useRef(0);
  const tickRef = useRef(0);
  const dragSnapshotRef = useRef<DragSnapshot | null>(null);
  const mousePointRef = useRef<Point | null>(null);

  const reset = useCallback(async () => {
    const bounds = await client.getBounds();
    const position = clampPointToBounds(
      {
        x: bounds.x + Math.round(bounds.width * 0.18),
        y: bounds.y + Math.round(bounds.height * 0.62),
      },
      bounds,
      PET_WINDOW_SIZE,
    );

    await client.setPosition(position);
    setMotion({ ...INITIAL_MOTION, position });
    stateRef.current = "idle";
    setState("idle");
    setNearbyMouse(false);
    setDragging(false);
    idleMsRef.current = 0;
    tickRef.current = 0;
    dragSnapshotRef.current = null;
    mousePointRef.current = null;
  }, [client]);

  const setMousePoint = useCallback((point: Point | null) => {
    mousePointRef.current = point;
  }, []);

  const startDrag = useCallback(
    async (pointer: Point) => {
      const [position, bounds] = await Promise.all([client.getPosition(), client.getBounds()]);
      dragSnapshotRef.current = {
        offset: {
          x: pointer.x - position.x,
          y: pointer.y - position.y,
        },
        bounds,
      };
      setDragging(true);
      stateRef.current = "drag";
      setState("drag");
    },
    [client],
  );

  const moveDrag = useCallback(
    async (pointer: Point) => {
      const snapshot = dragSnapshotRef.current;

      if (!snapshot) {
        return;
      }

      const position = clampPointToBounds(
        {
          x: pointer.x - snapshot.offset.x,
          y: pointer.y - snapshot.offset.y,
        },
        snapshot.bounds,
        PET_WINDOW_SIZE,
      );

      await client.setPosition(position);
      setMotion((current) => ({
        ...current,
        position,
        velocity: { ...current.velocity },
      }));
    },
    [client],
  );

  const endDrag = useCallback(() => {
    dragSnapshotRef.current = null;
    setDragging(false);
    idleMsRef.current = 0;
  }, []);

  useEffect(() => {
    let removeResetListener: (() => void) | null = null;
    let active = true;

    void reset();

    client.onReset(() => {
      void reset();
    }).then((unlisten) => {
      if (active) {
        removeResetListener = unlisten;
        return;
      }

      unlisten();
    }).catch((error: unknown) => {
      console.error("Unable to attach Mewi reset listener", error);
    });

    return () => {
      active = false;
      removeResetListener?.();
    };
  }, [client, reset]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const petCenter = {
        x: PET_WINDOW_SIZE.width / 2,
        y: PET_WINDOW_SIZE.height / 2,
      };
      const nextNearbyMouse = isMouseNearby(mousePointRef.current, petCenter);

      setNearbyMouse(nextNearbyMouse);
      idleMsRef.current = nextNearbyMouse || dragging ? 0 : idleMsRef.current + TICK_MS;
      tickRef.current += 1;

      const nextState = choosePetState({
        state: tickRef.current % WALK_EVERY_TICK === 0 && stateRef.current === "idle" ? "walk" : stateRef.current,
        idleMs: idleMsRef.current,
        nearbyMouse: nextNearbyMouse,
        dragging,
      });
      stateRef.current = nextState;
      setState(nextState);

      if (!dragging && shouldAutoWalk(nextState) && tickRef.current % WALK_EVERY_TICK === 0) {
        client.getBounds().then((bounds) => {
          setMotion((current) => {
            const nextMotion = nextWalkMotion(current, bounds, PET_WINDOW_SIZE);
            void client.setPosition(nextMotion.position);
            return nextMotion;
          });
        }).catch((error: unknown) => {
          console.error("Unable to update Mewi position", error);
        });
      }
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [client, dragging]);

  return {
    state,
    facing: motion.facing,
    nearbyMouse,
    dragging,
    reset,
    setMousePoint,
    startDrag,
    moveDrag,
    endDrag,
  };
}
