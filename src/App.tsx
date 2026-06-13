import { CatSprite } from "./pet/CatSprite";
import { usePetController } from "./pet/usePetController";
import type { CSSProperties } from "react";
import "./styles.css";

export function App() {
  const pet = usePetController();
  const stageClassName = `petStage petStage-cursor-${pet.cursorMode}${pet.dragging ? " petStage-dragging" : ""}`;

  return (
    <main
      className={stageClassName}
      data-state={pet.state}
      data-visual-action={pet.visualAction}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        void pet.startDrag({ x: event.screenX, y: event.screenY });
      }}
      onPointerMove={(event) => {
        pet.markInteraction();
        if (pet.dragging) {
          void pet.moveDrag({ x: event.screenX, y: event.screenY });
        }
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        pet.endDrag();
      }}
      onPointerCancel={pet.endDrag}
    >
      {pet.toyPoint ? <TeaserToy point={pet.toyPoint} intensity={pet.toyIntensity} /> : null}
      <button
        className="petHitArea"
        type="button"
        aria-label="Drag Mewi"
      >
        <CatSprite
          breed={pet.breed}
          state={pet.state}
          facing={pet.facing}
          cursorMode={pet.cursorMode}
          eyeOffset={pet.eyeOffset}
          visualAction={pet.visualAction}
          toyIntensity={pet.toyIntensity}
        />
      </button>
    </main>
  );
}

function TeaserToy({ point, intensity }: { point: { x: number; y: number }; intensity: "none" | "tease" | "excited" }) {
  return (
    <div
      className={`teaserToy teaserToy-${intensity}`}
      style={{
        "--toy-x": `${point.x}px`,
        "--toy-y": `${point.y}px`,
      } as CSSProperties}
      aria-hidden="true"
    >
      <span className="teaserToy-line" />
      <span className="teaserToy-feather" />
    </div>
  );
}
