import { CatSprite } from "./pet/CatSprite";
import { usePetController } from "./pet/usePetController";
import "./styles.css";

export function App() {
  const pet = usePetController();
  const stageClassName = `petStage petStage-cursor-${pet.cursorMode}`;

  return (
    <main
      className={stageClassName}
      data-state={pet.state}
      data-visual-action={pet.visualAction}
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
      <button
        className="petHitArea"
        type="button"
        aria-label="Drag Mewi"
        onDoubleClick={() => {
          void pet.reset();
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          void pet.startDrag({ x: event.screenX, y: event.screenY });
        }}
      >
        <CatSprite
          breed={pet.breed}
          state={pet.state}
          facing={pet.facing}
          cursorMode={pet.cursorMode}
          eyeOffset={pet.eyeOffset}
          visualAction={pet.visualAction}
        />
      </button>
    </main>
  );
}
