import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { currentMonitor, cursorPosition, getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
import { PET_WINDOW_SIZE } from "../pet/constants";
import type { DesktopObject, DesktopObjectKind, Point, Rect } from "../pet/types";

export type DesktopWindowClient = Readonly<{
  getPosition: () => Promise<Point>;
  setPosition: (point: Point) => Promise<void>;
  getBounds: () => Promise<Rect>;
  getCursorPosition: () => Promise<Point | null>;
  scanDesktopEnvironment: () => Promise<readonly DesktopObject[]>;
  onReset: (handler: () => void) => Promise<() => void>;
  onBringBack: (handler: () => void) => Promise<() => void>;
  onBreedChange: (handler: (breed: unknown) => void) => Promise<() => void>;
  setTrayBreed: (breed: string) => Promise<void>;
}>;

const fallbackBounds = (): Rect => ({
  x: 0,
  y: 0,
  width: window.screen.availWidth,
  height: window.screen.availHeight,
});

const fallbackClient: DesktopWindowClient = {
  getPosition: async () => ({ x: 80, y: 80 }),
  setPosition: async () => undefined,
  getBounds: async () => fallbackBounds(),
  getCursorPosition: async () => null,
  scanDesktopEnvironment: async () => [],
  onReset: async () => () => undefined,
  onBringBack: async () => () => undefined,
  onBreedChange: async () => () => undefined,
  setTrayBreed: async () => undefined,
};

export function createDesktopWindowClient(): DesktopWindowClient {
  if (!("__TAURI_INTERNALS__" in window)) {
    return fallbackClient;
  }

  const appWindow = getCurrentWindow();

  return {
    getPosition: async () => {
      const position = await appWindow.outerPosition();
      return { x: position.x, y: position.y };
    },
    setPosition: async (point) => {
      await appWindow.setPosition(new PhysicalPosition(point.x, point.y));
    },
    getCursorPosition: async () => {
      const position = await cursorPosition();
      return { x: position.x, y: position.y };
    },
    getBounds: async () => {
      const monitor = await currentMonitor();

      if (!monitor) {
        return fallbackBounds();
      }

      return {
        x: monitor.position.x,
        y: monitor.position.y,
        width: Math.max(PET_WINDOW_SIZE.width, monitor.size.width),
        height: Math.max(PET_WINDOW_SIZE.height, monitor.size.height),
      };
    },
    scanDesktopEnvironment: async () => {
      const objects = await invoke<unknown>("scan_desktop_environment");
      return parseDesktopObjects(objects);
    },
    onReset: async (handler) => {
      const unlisten = await listen("mewi-reset", handler);
      return unlisten;
    },
    onBringBack: async (handler) => {
      const unlisten = await listen("mewi-bring-back", handler);
      return unlisten;
    },
    onBreedChange: async (handler) => {
      const unlisten = await listen("mewi-breed-change", (event) => handler(event.payload));
      return unlisten;
    },
    setTrayBreed: async (breed) => {
      await invoke("set_tray_breed", { breed });
    },
  };
}

function parseDesktopObjects(value: unknown): readonly DesktopObject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || !isDesktopObjectKind(item.kind) || typeof item.id !== "string" || typeof item.label !== "string") {
      return [];
    }

    const bounds = item.bounds;

    if (!isRecord(bounds) || !isNumber(bounds.x) || !isNumber(bounds.y) || !isNumber(bounds.width) || !isNumber(bounds.height)) {
      return [];
    }

    return [
      {
        id: item.id,
        kind: item.kind,
        label: item.label,
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      },
    ];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDesktopObjectKind(value: unknown): value is DesktopObjectKind {
  return value === "folder" || value === "image" || value === "terminal";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
