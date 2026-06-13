import { listen } from "@tauri-apps/api/event";
import { currentMonitor, getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
import { PET_WINDOW_SIZE } from "../pet/constants";
import type { Point, Rect } from "../pet/types";

export type DesktopWindowClient = Readonly<{
  getPosition: () => Promise<Point>;
  setPosition: (point: Point) => Promise<void>;
  getBounds: () => Promise<Rect>;
  onReset: (handler: () => void) => Promise<() => void>;
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
  onReset: async () => () => undefined,
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
    onReset: async (handler) => {
      const unlisten = await listen("mewi-reset", handler);
      return unlisten;
    },
  };
}
