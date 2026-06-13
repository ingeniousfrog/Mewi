import { useRef } from "react";
import { OnboardingOverlay } from "./components/OnboardingOverlay";
import { CatSprite } from "./pet/CatSprite";
import { usePetController } from "./pet/usePetController";
import "./styles.css";

const HEAD_DRAG_THRESHOLD = 8;

export function App() {
  const pet = usePetController();
  const headPointerRef = useRef<{ start: { x: number; y: number }; pointerId: number } | null>(null);
  const stageClassName = `petStage petStage-cursor-${pet.cursorMode}${pet.dragging ? " petStage-dragging" : ""}`;

  return (
    <>
      {pet.showOnboarding ? (
        <OnboardingOverlay
          onRequestDesktopAccess={pet.requestDesktopAccess}
          onRequestInputAccess={pet.requestInputAccess}
          onComplete={pet.completeOnboarding}
        />
      ) : null}
      <main
        className={stageClassName}
        data-state={pet.state}
        data-visual-action={pet.visualAction}
        onPointerMove={(event) => {
          pet.markInteraction();

          const headPointer = headPointerRef.current;

          if (headPointer && headPointer.pointerId === event.pointerId && !pet.dragging) {
            const distance = Math.hypot(event.screenX - headPointer.start.x, event.screenY - headPointer.start.y);

            if (distance > HEAD_DRAG_THRESHOLD) {
              headPointerRef.current = null;
              void pet.startDrag({ x: event.screenX, y: event.screenY });
              void pet.moveDrag({ x: event.screenX, y: event.screenY });
            }

            return;
          }

          if (pet.dragging) {
            void pet.moveDrag({ x: event.screenX, y: event.screenY });
          }
        }}
        onPointerUp={(event) => {
          const headPointer = headPointerRef.current;

          if (headPointer && headPointer.pointerId === event.pointerId && !pet.dragging) {
            const distance = Math.hypot(event.screenX - headPointer.start.x, event.screenY - headPointer.start.y);

            if (distance <= HEAD_DRAG_THRESHOLD) {
              pet.petHead();
            }

            headPointerRef.current = null;
            return;
          }

          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }

          pet.endDrag();
        }}
        onPointerCancel={() => {
          headPointerRef.current = null;
          pet.endDrag();
        }}
      >
        <button
          className="petHitArea"
          type="button"
          aria-label="Drag Mewi"
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
            toyIntensity={pet.toyIntensity}
            onHeadPointerDown={(event) => {
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              headPointerRef.current = {
                start: { x: event.screenX, y: event.screenY },
                pointerId: event.pointerId,
              };
              pet.markInteraction();
            }}
            onHeadPointerEnter={() => {
              pet.setHeadHovered(true);
            }}
            onHeadPointerLeave={() => {
              pet.setHeadHovered(false);
            }}
          />
        </button>
      </main>
    </>
  );
}
