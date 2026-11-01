import { useRef, useState } from 'react';
import { missingSets } from '@/utils/workout/workoutState';
import DeleteSetDialog from './dialogs/DeleteSetDialog';
import FinishDialog from './dialogs/FinishDialog';
import ExercisePanel from './ExercisePanel';
import RestTimer from './RestTimer';
import SegmentBar from './SegmentBar';
import SessionHeader from './SessionHeader';
import SetsTable from './SetsTable';

/**
 * La pantalla de entrenamiento: encabezado con los ejercicios, el ejercicio a la vista a la izquierda y, a la derecha,
 * el descanso y las series (debajo de 768 px es una sola columna: el ejercicio arriba y el descanso antes de las series,
 * que es lo que se mira después de registrar). Las acciones son las de `useActiveWorkout`.
 * Terminar pregunta si faltan series o si no hay ninguna (descartar); con todo hecho termina directo.
 * Cuando el botón que tenía el foco desaparece (Saltar el descanso, la ✕ de una serie que se borra), el foco va a
 * Registrar serie en vez de perderse.
 */
export default function ActiveSession({
  workout, register, remove, goTo, next, prev, adjustRest, skipRest, finish, discard,
}) {
  const [finishing, setFinishing] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const registerRef = useRef(null);
  const focusRegisterOnClose = useRef(false);
  const hasSets = workout.sets.length > 0;
  const missing = missingSets(workout);

  const requestFinish = () => (hasSets && missing === 0 ? finish() : setFinishing(true));
  const skip = () => {
    skipRest();
    registerRef.current?.focus();
  };
  const confirmDelete = () => {
    remove(deleting.id);
    setDeleting(null);
    focusRegisterOnClose.current = true;
  };
  // Solo después de confirmar: con Cancelar o Esc la ✕ sigue ahí, esto no hace nada y el diálogo le devuelve el foco.
  const afterDeleteDialog = (event) => {
    if (!focusRegisterOnClose.current) return;
    focusRegisterOnClose.current = false;
    event.preventDefault();
    registerRef.current?.focus();
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <SessionHeader
        position={workout.cursor + 1}
        total={workout.exercises.length}
        startedAt={workout.startedAt}
        onPrev={prev}
        onNext={next}
        onFinish={requestFinish}
      />
      <SegmentBar workout={workout} onSelect={goTo} />
      <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
        <div className="min-w-0 md:flex-[1.55]">
          <ExercisePanel workout={workout} onRegister={register} registerRef={registerRef} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 md:min-w-[250px] md:flex-1">
          {workout.restEndsAt && (
            <div className="order-first md:order-last">
              <RestTimer workout={workout} onAdjust={adjustRest} onSkip={skip} />
            </div>
          )}
          <SetsTable workout={workout} onDelete={setDeleting} />
        </div>
      </div>
      <FinishDialog
        open={finishing}
        hasSets={hasSets}
        missing={missing}
        onKeep={() => setFinishing(false)}
        onFinish={finish}
        onDiscard={discard}
      />
      <DeleteSetDialog
        set={deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        onCloseAutoFocus={afterDeleteDialog}
      />
    </div>
  );
}
