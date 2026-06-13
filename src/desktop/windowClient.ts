import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { cursorPosition, getCurrentWindow, LogicalSize, PhysicalPosition } from "@tauri-apps/api/window";
import type { PermissionStatus } from "../pet/onboarding";
import { ONBOARDING_WINDOW_SIZE, PET_WINDOW_SIZE } from "../pet/constants";
import type { DesktopObject, DesktopObjectKind, Point, Rect, Size } from "../pet/types";

export type DesktopWindowClient = Readonly<{
  getPosition: () => Promise<Point>;
  setPosition: (point: Point) => Promise<void>;
  setSize: (size: Size) => Promise<void>;
  getBounds: () => Promise<Rect>;
  getCursorPosition: () => Promise<Point | null>;
  setIgnoreCursorEvents: (ignore: boolean) => Promise<void>;
  scanDesktopEnvironment: () => Promise<readonly DesktopObject[]>;
  checkPermissions: () => Promise<PermissionStatus>;
  requestDesktopAccess: () => Promise<PermissionStatus>;
  requestInputAccess: () => Promise<PermissionStatus>;
  onReset: (handler: () => void) => Promise<() => void>;
  onBringBack: (handler: () => void) => Promise<() => void>;
  onBreedChange: (handler: (breed: unknown) => void) => Promise<() => void>;
  onActivityChange: (handler: (activity: unknown) => void) => Promise<() => void>;
  onMuteChange: (handler: (muted: unknown) => void) => Promise<() => void>;
  onDesktopChanged: (handler: () => void) => Promise<() => void>;
  onUserKeyActivity: (handler: () => void) => Promise<() => void>;
  onUserClickActivity: (handler: () => void) => Promise<() => void>;
  setTrayBreed: (breed: string) => Promise<void>;
  setTrayActivity: (activity: string) => Promise<void>;
  setTrayMute: (muted: boolean) => Promise<void>;
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
  setSize: async () => undefined,
  getBounds: async () => fallbackBounds(),
  getCursorPosition: async () => null,
  setIgnoreCursorEvents: async () => undefined,
  scanDesktopEnvironment: async () => [],
  checkPermissions: async () => ({ desktop: false, input: false, desktopItemCount: 0 }),
  requestDesktopAccess: async () => ({ desktop: false, input: false, desktopItemCount: 0 }),
  requestInputAccess: async () => ({ desktop: false, input: false, desktopItemCount: 0 }),
  onReset: async () => () => undefined,
  onBringBack: async () => () => undefined,
  onBreedChange: async () => () => undefined,
  onActivityChange: async () => () => undefined,
  onMuteChange: async () => () => undefined,
  onDesktopChanged: async () => () => undefined,
  onUserKeyActivity: async () => () => undefined,
  onUserClickActivity: async () => () => undefined,
  setTrayBreed: async () => undefined,
  setTrayActivity: async () => undefined,
  setTrayMute: async () => undefined,
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
    setSize: async (size) => {
      await appWindow.setSize(new LogicalSize(size.width, size.height));
    },
    getCursorPosition: async () => {
      const position = await cursorPosition();
      return { x: position.x, y: position.y };
    },
    setIgnoreCursorEvents: async (ignore) => {
      await appWindow.setIgnoreCursorEvents(ignore);
    },
    getBounds: async () => {
      const bounds = await invoke<unknown>("get_usable_bounds");
      return parseScreenBounds(bounds) ?? fallbackBounds();
    },
    scanDesktopEnvironment: async () => {
      const objects = await invoke<unknown>("scan_desktop_environment");
      return parseDesktopObjects(objects);
    },
    checkPermissions: async () => parsePermissionStatus(await invoke<unknown>("check_permissions")),
    requestDesktopAccess: async () => parsePermissionStatus(await invoke<unknown>("request_desktop_access")),
    requestInputAccess: async () => parsePermissionStatus(await invoke<unknown>("request_input_access")),
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
    onActivityChange: async (handler) => {
      const unlisten = await listen("mewi-activity-change", (event) => handler(event.payload));
      return unlisten;
    },
    onMuteChange: async (handler) => {
      const unlisten = await listen("mewi-mute-change", (event) => handler(event.payload));
      return unlisten;
    },
    onDesktopChanged: async (handler) => {
      const unlisten = await listen("desktop-changed", handler);
      return unlisten;
    },
    onUserKeyActivity: async (handler) => {
      const unlisten = await listen("user-key-activity", handler);
      return unlisten;
    },
    onUserClickActivity: async (handler) => {
      const unlisten = await listen("user-click-activity", handler);
      return unlisten;
    },
    setTrayBreed: async (breed) => {
      await invoke("set_tray_breed", { breed });
    },
    setTrayActivity: async (activity) => {
      await invoke("set_tray_activity", { activity });
    },
    setTrayMute: async (muted) => {
      await invoke("set_tray_mute", { muted });
    },
  };
}

function parseScreenBounds(value: unknown): Rect | null {
  if (!isRecord(value) || !isNumber(value.x) || !isNumber(value.y) || !isNumber(value.width) || !isNumber(value.height)) {
    return null;
  }

  return {
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
  };
}

function parsePermissionStatus(value: unknown): PermissionStatus {
  if (!isRecord(value)) {
    return { desktop: false, input: false, desktopItemCount: 0 };
  }

  return {
    desktop: value.desktop === true,
    input: value.input === true,
    desktopItemCount: isNumber(value.desktopItemCount) ? value.desktopItemCount : 0,
    message: typeof value.message === "string" ? value.message : undefined,
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
