import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { CatBreed, CursorMode, PetState, Point, ToyIntensity, VisualAction } from "./types";

type CatSpriteProps = Readonly<{
  breed: CatBreed;
  state: PetState;
  facing: "left" | "right";
  cursorMode: CursorMode;
  eyeOffset: Point;
  visualAction: VisualAction;
  toyIntensity: ToyIntensity;
  onHeadPointerDown?: (event: ReactPointerEvent<SVGPathElement>) => void;
  onHeadPointerEnter?: () => void;
  onHeadPointerLeave?: () => void;
}>;

export function CatSprite({
  breed,
  state,
  facing,
  cursorMode,
  eyeOffset,
  visualAction,
  toyIntensity,
  onHeadPointerDown,
  onHeadPointerEnter,
  onHeadPointerLeave,
}: CatSpriteProps) {
  const className = `catSprite catSprite-${state} catSprite-${facing} catSprite-toy-${toyIntensity} catBreed-${breed}`;
  const eyeStyle = {
    "--eye-x": `${eyeOffset.x}px`,
    "--eye-y": `${eyeOffset.y}px`,
  } as CSSProperties;

  return (
    <div className={className} data-cursor-mode={cursorMode} data-visual-action={visualAction} aria-label={`Mewi is ${state}`}>
      <svg className="catSvg" viewBox="0 0 180 180" role="img" aria-hidden="true">
        <ellipse className="catShadow" cx="91" cy="150" rx="55" ry="13" />
        <path className="catTail" d="M132 111 C164 92 156 55 132 66 C118 72 122 90 137 84" />
        <path className="catFur catFur-left" d="M57 88 C45 98 44 112 54 122" />
        <path className="catFur catFur-right" d="M130 88 C142 98 142 112 132 122" />
        <path className="catBody" d="M52 95 C52 70 70 51 94 51 C123 51 142 73 140 104 L137 133 C135 146 124 154 91 154 C60 154 47 145 47 128 Z" />
        <path
          className="catHeadHit"
          d="M48 75 L56 38 L78 57 C88 53 99 53 110 57 L133 38 L139 75 C148 91 144 116 128 128 C112 139 73 139 57 128 C40 115 39 91 48 75 Z"
          onPointerDown={onHeadPointerDown}
          onPointerEnter={onHeadPointerEnter}
          onPointerLeave={onHeadPointerLeave}
        />
        <path className="catHead" d="M48 75 L56 38 L78 57 C88 53 99 53 110 57 L133 38 L139 75 C148 91 144 116 128 128 C112 139 73 139 57 128 C40 115 39 91 48 75 Z" />
        <path className="catInnerEar" d="M59 63 L62 50 L71 61 Z" />
        <path className="catInnerEar" d="M126 63 L124 50 L115 61 Z" />
        <g className="catFace" style={eyeStyle}>
          <ellipse className="catEye catEye-left" cx="75" cy="91" rx="7" ry={state === "sleep" || state === "petHead" ? "1.5" : "8"} />
          <ellipse className="catEye catEye-right" cx="113" cy="91" rx="7" ry={state === "sleep" || state === "petHead" ? "1.5" : "8"} />
          <path className="catNose" d="M90 102 L96 102 L93 107 Z" />
          <path className="catMouth" d="M93 108 C88 113 82 113 79 109 M93 108 C98 113 104 113 107 109" />
          <path className="catWhiskers" d="M68 104 L42 98 M68 111 L39 113 M118 104 L144 98 M118 111 L147 113" />
        </g>
        <path className="catPaw catPaw-left" d="M65 137 C65 148 80 148 81 137" />
        <path className="catPaw catPaw-right" d="M106 137 C106 148 121 148 122 137" />
        {state === "sleep" ? (
          <g className="catZzz">
            <text x="128" y="48">Z</text>
            <text x="143" y="33">z</text>
            <text x="154" y="22">z</text>
          </g>
        ) : null}
        {visualAction !== "none" && visualAction !== "mirror-type" && visualAction !== "mirror-drum"
          ? <text className="catActionGlyph" x="24" y="40">{actionGlyph(visualAction)}</text>
          : null}
        {state === "perform" && visualAction === "mirror-type" ? (
          <g className="catMirrorKeyboard" aria-hidden="true">
            <rect className="catMirrorKeyboard-body" x="34" y="118" width="112" height="34" rx="6" />
            <rect className="catMirrorKeyboard-key" x="42" y="126" width="10" height="8" rx="2" />
            <rect className="catMirrorKeyboard-key" x="56" y="126" width="10" height="8" rx="2" />
            <rect className="catMirrorKeyboard-key" x="70" y="126" width="10" height="8" rx="2" />
            <rect className="catMirrorKeyboard-key" x="84" y="126" width="10" height="8" rx="2" />
            <rect className="catMirrorKeyboard-key" x="98" y="126" width="10" height="8" rx="2" />
            <rect className="catMirrorKeyboard-key" x="112" y="126" width="10" height="8" rx="2" />
            <rect className="catMirrorKeyboard-key" x="126" y="126" width="10" height="8" rx="2" />
            <path className="catMirrorPaw" d="M118 108 C126 104 134 108 132 116 C130 122 122 122 118 116 Z" />
          </g>
        ) : null}
        {state === "perform" && visualAction === "mirror-drum" ? (
          <g className="catMirrorDrums" aria-hidden="true">
            <ellipse className="catMirrorDrum" cx="58" cy="132" rx="18" ry="10" />
            <ellipse className="catMirrorDrum" cx="92" cy="128" rx="22" ry="12" />
            <ellipse className="catMirrorDrum" cx="126" cy="132" rx="18" ry="10" />
            <path className="catMirrorStick" d="M48 112 L68 124" />
            <path className="catMirrorStick" d="M138 112 L118 124" />
            <path className="catMirrorPaw" d="M72 104 C80 100 88 104 86 112 C84 118 76 118 72 112 Z" />
            <path className="catMirrorPaw" d="M108 104 C116 100 124 104 122 112 C120 118 112 118 108 112 Z" />
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function actionGlyph(action: VisualAction): string {
  const glyphByAction: Record<VisualAction, string> = {
    none: "",
    sniff: "~",
    step: "*",
    sit: "v",
    rub: "+",
    "nap-corner": "z",
    "fake-push": ">",
    "terminal-rest": "_",
    pounce: "!",
    swat: "/",
    hop: "^",
    "head-rub": "♡",
    "mirror-type": "⌨",
    "mirror-drum": "♫",
  };

  return glyphByAction[action];
}
