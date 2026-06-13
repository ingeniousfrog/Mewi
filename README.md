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

- Idle, walk, sleep, stretch, explore, perform, pet-head, and drag states
- A compact 196×196 window sized to the cat so nearby desktop clicks are not blocked
- Eye tracking when the pointer is over the cat
- Head petting: hover the cat's head, then click to rub and hear a soft purr
- Typing mirror: when you type, Mewi pulls out a keyboard and taps along
- Click mirror: when you click the mouse, Mewi plays a tiny drum kit
- Dragging the cat around the desktop
- Screen-bound clamping for automatic movement and dragging
- macOS desktop object sensing for folders, images, and terminal windows
- Autonomous exploration: Mewi walks toward desktop folders and images to sniff, sit, and rub
- Tray menu actions for Show, Hide, Bring Mewi Back, Breed, Activity, Mute Sounds, and Quit

The behavior lives in `src/pet/`, the desktop window adapter lives in
`src/desktop/`, and the native Tauri tray/window setup lives in `src-tauri/`.
The placeholder cat is an SVG/CSS component that can be replaced by real
animation assets later.

## First launch permissions

On first launch, Mewi shows a short welcome card **centered on screen** with two Allow buttons:

1. **Allow 桌面探索** — macOS shows a Finder automation prompt. Tap Allow once and Mewi can walk toward desktop folders and images.
2. **Allow 打字和点击镜像** — macOS shows an Accessibility prompt. Tap Allow once and Mewi can mirror your keyboard and mouse clicks.

You do not need to dig through System Settings manually unless you previously denied the prompt. After you tap Allow in the system dialog, the button label updates and any remaining guidance appears below the buttons. When you continue, Mewi shrinks to a cat-sized window, moves to a safe spot above the Dock, and stays out of the menu bar area.

## Tray controls

- **Activity**: choose Quiet, Lively (default), or Hyper to control how often Mewi
  roams, explores desktop items, hops, and falls asleep
- **Mute Sounds**: disable synthesized purrs, meows, typing taps, and drum beats
- **Breed**: switch the cat appearance

## Interaction tips

- Hover and click the cat's head to pet it
- Drag the cat body to move it around the screen
- Only the cat itself captures clicks; the rest of your desktop stays clickable
