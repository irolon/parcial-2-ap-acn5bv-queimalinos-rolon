import { FOCUS_RING } from '@/components/shared/layout/compact';
import { exerciseSets } from '@/utils/workout/workoutState';

const BAR = {
  current: 'bg-accentText',
  done: 'bg-accent',
  partial: 'bg-accent/50',
  todo: 'bg-ink3',
};

// El ejercicio a la vista, los que ya tienen todas sus series, los empezados y los que faltan.
function segmentState(workout, index) {
  if (index === workout.cursor) return 'current';
  const done = exerciseSets(workout, index).length;
  if (done === 0) return 'todo';
  return done >= workout.exercises[index].sets ? 'done' : 'partial';
}

// Cómo va el ejercicio, dicho con palabras (el color de la barra no lo lee un lector de pantalla).
function progressText(done, planned) {
  if (done === 0) return 'sin empezar';
  return done >= planned ? 'completo' : `${done} de ${planned} series`;
}

/**
 * La barra de segmentos de la sesión: uno por ejercicio, y tocar uno salta a ese ejercicio. Cada botón dice cuál es
 * y cómo va: "Ejercicio 2: Remo con barra, 1 de 3 series" (o ", completo" / ", sin empezar").
 */
export default function SegmentBar({ workout, onSelect }) {
  return (
    <ol aria-label="Ejercicios de la sesión" className="flex gap-1.5 rounded-lg border border-ink2 bg-ink1 px-3">
      {workout.exercises.map((exercise, index) => {
        const state = segmentState(workout, index);
        const progress = progressText(exerciseSets(workout, index).length, exercise.sets);
        return (
          <li key={exercise.routineExerciseId} className="min-w-0 flex-1">
            <button
              type="button"
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
              aria-label={`Ejercicio ${index + 1}: ${exercise.name}, ${progress}`}
              title={exercise.name}
              onClick={() => onSelect(index)}
              className={`group flex h-8 w-full cursor-pointer items-center ${FOCUS_RING}`}
            >
              <span className={`h-1 w-full rounded-sm transition-all group-hover:h-1.5 ${BAR[state]}`} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
