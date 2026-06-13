import { CatSprite } from "./pet/CatSprite";
import { usePetController } from "./pet/usePetController";
import "./styles.css";

export function App() {
  const pet = usePetController();

  return (
    <main
      className="petStage"
      data-state={pet.state}
      onPointerMove={(event) => {
        pet.setMousePoint({ x: event.clientX, y: event.clientY });
        if (pet.dragging) {
          void pet.moveDrag({ x: event.screenX, y: event.screenY });
        }
      }}
      onPointerLeave={() => pet.setMousePoint(null)}
      onPointerUp={(event) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
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
        <CatSprite state={pet.state} facing={pet.facing} nearbyMouse={pet.nearbyMouse} />
      </button>
    </main>
  );
}
