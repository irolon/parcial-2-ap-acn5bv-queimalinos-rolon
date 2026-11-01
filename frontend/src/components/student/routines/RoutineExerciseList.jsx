import { DEFAULT_REST_SECONDS } from '@/utils/routines/defaults';
import { planRows } from '@/utils/routines/todayPlan';
import { isSafeVideoUrl } from '@/utils/exercises/videoUrl';

const restLabel = (seconds) => (seconds === 0 ? 'Sin descanso' : `Descanso ${seconds} s`);

// "4 × 10 · Descanso 90 s · Tempo 3-1-1": lo que la rutina no trae sale con los valores por defecto de la sesión.
function details(exercise, setsReps) {
  return [
    setsReps,
    restLabel(exercise.rest_seconds ?? DEFAULT_REST_SECONDS),
    exercise.tempo ? `Tempo ${exercise.tempo}` : null,
  ].filter(Boolean).join(' · ');
}

/** Los ejercicios de una rutina en orden, con series × reps, descanso, tempo, notas y el link al video si tiene. */
export default function RoutineExerciseList({ exercises }) {
  const list = exercises ?? [];
  if (list.length === 0) return null;
  const rows = planRows(list);
  return (
    <ol aria-label="Ejercicios" className="flex flex-col gap-2.5">
      {list.map((exercise, index) => {
        const videoUrl = exercise.exercise?.video_url;
        return (
          <li key={rows[index].id ?? index} className="flex items-start gap-3 rounded-xl border border-ink2 bg-ink1 p-4">
            <span className="mt-1 font-mono text-[11px] text-ink6">{String(index + 1).padStart(2, '0')}</span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[15px] font-semibold text-bone0">{rows[index].name}</h3>
              <p className="mt-1 font-mono text-[11px] text-ink6">{details(exercise, rows[index].setsReps)}</p>
              {exercise.notes && <p className="mt-2 font-body text-sm text-bone2">{exercise.notes}</p>}
            </div>
            {isSafeVideoUrl(videoUrl) && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver video de ${rows[index].name} (se abre en otra pestaña)`}
                className="shrink-0 font-display text-[13px] font-semibold text-accentText hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText"
              >
                Ver video
              </a>
            )}
          </li>
        );
      })}
    </ol>
  );
}
