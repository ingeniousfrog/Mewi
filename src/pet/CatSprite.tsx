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
  const eyesClosed = state === "sleep" || state === "petHead";
  const showInteraction = isInteractionAction(visualAction);
  const showFishing = state === "fish" || visualAction === "fishing" || visualAction === "fish-catch";
  const showMirrorType = state === "perform" && visualAction === "mirror-type";
  const showMirrorDrum = state === "perform" && visualAction === "mirror-drum";

  return (
    <div className={className} data-cursor-mode={cursorMode} data-visual-action={visualAction} aria-label={`Mewi is ${state}`}>
      <svg className="catSvg" viewBox="0 0 180 180" role="img" aria-hidden="true">
        <defs>
          <radialGradient id="catBodyGrad" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="var(--cat-fur-light)" />
            <stop offset="100%" stopColor="var(--cat-fur)" />
          </radialGradient>
          <radialGradient id="catHeadGrad" cx="50%" cy="40%" r="58%">
            <stop offset="0%" stopColor="var(--cat-fur-light)" />
            <stop offset="100%" stopColor="var(--cat-fur)" />
          </radialGradient>
          <linearGradient id="catTailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--cat-fur-light)" />
            <stop offset="100%" stopColor="var(--cat-fur-dark)" />
          </linearGradient>
        </defs>

        <ellipse className="catShadow" cx="91" cy="154" rx="52" ry="11" />

        {showFishing ? <FishingScene visualAction={visualAction} /> : null}

        {!showFishing ? (
          <>
            <path className="catTail" d="M128 108 C158 88 168 52 142 62 C126 68 124 88 136 96" />
            <ellipse className="catBody" cx="92" cy="118" rx="46" ry="38" />
            <path className="catBelly" d="M68 118 C72 136 112 136 116 118" />
            <path className="catPaw catPaw-left" d="M68 142 C68 152 82 152 84 142" />
            <path className="catPaw catPaw-right" d="M100 142 C100 152 114 152 116 142" />
          </>
        ) : null}

        <g className="catHeadGroup">
          <path
            className="catHeadHit"
            d="M46 72 C46 48 62 34 90 34 C118 34 134 48 134 72 C134 98 118 118 90 118 C62 118 46 98 46 72 Z"
            onPointerDown={onHeadPointerDown}
            onPointerEnter={onHeadPointerEnter}
            onPointerLeave={onHeadPointerLeave}
          />
          <path className="catEar catEar-left" d="M54 52 L62 28 L78 46 Z" />
          <path className="catEar catEar-right" d="M126 52 L118 28 L102 46 Z" />
          <path className="catInnerEar catInnerEar-left" d="M60 48 L64 36 L72 46 Z" />
          <path className="catInnerEar catInnerEar-right" d="M120 48 L116 36 L108 46 Z" />
          <ellipse className="catHead" cx="90" cy="78" rx="44" ry="40" />
          <ellipse className="catBlush catBlush-left" cx="62" cy="88" rx="8" ry="5" />
          <ellipse className="catBlush catBlush-right" cx="118" cy="88" rx="8" ry="5" />

          <g className="catFace" style={eyeStyle}>
            <ellipse className="catEyeWhite catEyeWhite-left" cx="74" cy="76" rx="11" ry={eyesClosed ? 2 : 12} />
            <ellipse className="catEyeWhite catEyeWhite-right" cx="106" cy="76" rx="11" ry={eyesClosed ? 2 : 12} />
            {!eyesClosed ? (
              <>
                <ellipse className="catEye catEye-left" cx="76" cy="78" rx="6" ry="7" />
                <ellipse className="catEye catEye-right" cx="108" cy="78" rx="6" ry="7" />
                <circle className="catEyeShine catEyeShine-left" cx="78" cy="75" r="2.2" />
                <circle className="catEyeShine catEyeShine-right" cx="110" cy="75" r="2.2" />
              </>
            ) : null}
            <ellipse className="catNose" cx="90" cy="92" rx="4" ry="3" />
            <path className="catMouth" d="M90 95 C86 100 82 100 79 97 M90 95 C94 100 98 100 101 97" />
            <path className="catWhiskers" d="M58 92 L34 88 M58 98 L32 100 M122 92 L146 88 M122 98 L148 100" />
          </g>
        </g>

        {showInteraction ? <InteractionProps action={visualAction} /> : null}
        {state === "sleep" ? <SleepZzz /> : null}
        {showMirrorType ? <MirrorKeyboard /> : null}
        {showMirrorDrum ? <MirrorDrums /> : null}
      </svg>
    </div>
  );
}

function isInteractionAction(action: VisualAction): boolean {
  return action === "folder-dig" || action === "image-rub" || action === "terminal-pounce";
}

function InteractionProps({ action }: Readonly<{ action: VisualAction }>) {
  if (action === "folder-dig") {
    return (
      <g className="catProp catProp-folder" aria-hidden="true">
        <path className="catFolder" d="M18 128 L18 152 C18 158 22 162 28 162 L62 162 C68 162 72 158 72 152 L72 136 L48 136 L42 128 Z" />
        <path className="catFolderTab" d="M18 128 L42 128 L48 136 L72 136 L72 128 L58 128 L52 122 L38 122 L32 128 Z" />
        <g className="catDigPaw">
          <path d="M54 118 C58 110 68 110 70 118 C72 124 62 126 54 118 Z" />
        </g>
        <g className="catDust">
          <circle cx="78" cy="148" r="3" />
          <circle cx="86" cy="154" r="2.5" />
          <circle cx="74" cy="156" r="2" />
        </g>
      </g>
    );
  }

  if (action === "image-rub") {
    return (
      <g className="catProp catProp-image" aria-hidden="true">
        <rect className="catPhoto" x="8" y="118" width="44" height="36" rx="4" />
        <circle className="catPhotoSun" cx="20" cy="130" r="6" />
        <path className="catPhotoHill" d="M12 148 L24 136 L36 144 L48 132 L48 154 L12 154 Z" />
        <g className="catHearts">
          <path d="M128 42 C128 36 136 34 138 40 C140 34 148 36 148 42 C148 50 138 58 138 58 C138 58 128 50 128 42 Z" />
          <path d="M148 58 C148 54 154 52 156 56 C158 52 164 54 164 58 C164 64 156 70 156 70 C156 70 148 64 148 58 Z" />
        </g>
      </g>
    );
  }

  if (action === "terminal-pounce") {
    return (
      <g className="catProp catProp-terminal" aria-hidden="true">
        <rect className="catTerminal" x="6" y="120" width="58" height="40" rx="5" />
        <rect className="catTerminalScreen" x="12" y="126" width="46" height="24" rx="3" />
        <g className="catTerminalKeys">
          <text x="16" y="140" className="catTerminalGlyph">
            $
          </text>
          <text x="26" y="140" className="catTerminalGlyph">
            ls
          </text>
          <text x="40" y="140" className="catTerminalGlyph">
            ~
          </text>
        </g>
        <g className="catTypePaws">
          <path d="M72 108 C80 102 90 106 88 116 C86 122 76 122 72 116 Z" />
          <path d="M98 104 C106 98 116 102 114 112 C112 118 102 118 98 112 Z" />
        </g>
      </g>
    );
  }

  return null;
}

function FishingScene({ visualAction }: Readonly<{ visualAction: VisualAction }>) {
  const caught = visualAction === "fish-catch";

  return (
    <g className="catProp catProp-fish" aria-hidden="true">
      <ellipse className="catPond" cx="90" cy="156" rx="62" ry="10" />
      <path className="catRipple catRipple-1" d="M52 156 C62 150 78 150 88 156" />
      <path className="catRipple catRipple-2" d="M92 156 C102 150 118 150 128 156" />
      <path className="catRod" d="M118 68 L138 148" />
      <path className="catRodLine" d="M138 148 C132 152 124 154 118 154" />
      <circle className="catBobber" cx="118" cy="154" r="4" />
      {caught ? (
        <g className="catCaughtFish">
          <ellipse cx="108" cy="142" rx="14" ry="8" />
          <path d="M94 142 L88 136 L88 148 Z" />
          <circle cx="118" cy="140" r="1.5" />
          <g className="catSplash">
            <circle cx="100" cy="150" r="2.5" />
            <circle cx="116" cy="148" r="2" />
            <circle cx="124" cy="152" r="1.8" />
          </g>
        </g>
      ) : (
        <g className="catJumpFish">
          <ellipse cx="96" cy="148" rx="8" ry="5" />
          <path d="M88 148 L84 144 L84 152 Z" />
        </g>
      )}
      <path className="catFishPaw" d="M112 92 C120 88 128 92 126 100 C124 106 116 106 112 100 Z" />
    </g>
  );
}

function SleepZzz() {
  return (
    <g className="catZzz">
      <text x="124" y="44">
        Z
      </text>
      <text x="138" y="30">
        z
      </text>
      <text x="150" y="18">
        z
      </text>
    </g>
  );
}

function MirrorKeyboard() {
  return (
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
  );
}

function MirrorDrums() {
  return (
    <g className="catMirrorDrums" aria-hidden="true">
      <ellipse className="catMirrorDrum" cx="58" cy="132" rx="18" ry="10" />
      <ellipse className="catMirrorDrum" cx="92" cy="128" rx="22" ry="12" />
      <ellipse className="catMirrorDrum" cx="126" cy="132" rx="18" ry="10" />
      <path className="catMirrorStick" d="M48 112 L68 124" />
      <path className="catMirrorStick" d="M138 112 L118 124" />
      <path className="catMirrorPaw" d="M72 104 C80 100 88 104 86 112 C84 118 76 118 72 112 Z" />
      <path className="catMirrorPaw" d="M108 104 C116 100 124 104 122 112 C120 118 112 118 108 112 Z" />
    </g>
  );
}
