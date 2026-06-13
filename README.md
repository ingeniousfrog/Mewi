# Mewi
a tiny cat living on your desktop

## Prototype

Mewi is currently a minimal Tauri v2 + React prototype. It opens a small transparent,
frameless, always-on-top desktop window with a placeholder SVG cat.

```sh
npm install
npm run tauri dev
```

The first version supports:

- Idle, walk, sleep, stretch, look, and drag states
- Pointer proximity reactions inside the pet window
- Dragging the cat around the desktop
- Screen-bound clamping for automatic movement and dragging
- Tray menu actions for Show, Hide, Reset, and Quit

The behavior lives in `src/pet/`, the desktop window adapter lives in
`src/desktop/`, and the native Tauri tray/window setup lives in `src-tauri/`.
The placeholder cat is an SVG/CSS component that can be replaced by real
animation assets later.
