import Pill from '@/components/shared/ui/Pill';
import QueryState from '@/components/shared/states/QueryState';
import SessionComment from '@/components/sessions/SessionComment';
import { useSessionDetail } from '@/hooks/sessions/useSessions';

const TH = 'px-2 py-1.5 text-left font-mono text-[10px] font-normal uppercase tracking-[0.8px] text-ink6';
const TD = 'px-2 py-1.5 font-mono text-xs text-bone0';

/** Verde por encima del plan, rojo por debajo; sin objetivo, color neutro. */
function vsPlan(actual, target) {
  if (actual == null || target == null) return 'text-bone0';
  if (actual > target) return 'text-good';
  return actual < target ? 'text-hot' : 'text-bone0';
}

function Planned({ value, unit = '' }) {
  return value == null ? null : (
    <span className="text-ink6">
      {' / '}
      {value}
      {unit}
    </span>
  );
}

function SetRow({ set, planned }) {
  if (!set.completed) {
    return (
      <tr className="border-t border-ink3">
        <td className={TD}>{set.set_number}</td>
        <td colSpan={2} className={`${TD} text-ink6`}>
          no hecha
        </td>
      </tr>
    );
  }
  return (
    <tr className="border-t border-ink3">
      <td className={TD}>{set.set_number}</td>
      <td className={TD}>
        <span className={vsPlan(set.actual_reps, planned?.reps)}>{set.actual_reps}</span>
        {planned ? <Planned value={planned.reps} /> : <span className="text-ink6"> sin plan</span>}
      </td>
      <td className={TD}>
        {set.actual_kg == null ? (
          '—'
        ) : (
          <>
            <span className={vsPlan(set.actual_kg, planned?.suggested_kg)}>{set.actual_kg} kg</span>
            <Planned value={planned?.suggested_kg} unit=" kg" />
          </>
        )}
      </td>
    </tr>
  );
}

function ExerciseBlock({ item }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="font-display text-[13px] font-medium text-bone0">{item.exercise.name}</span>
        {item.original_exercise && (
          <span className="font-body text-[11px] text-ink6">en lugar de {item.original_exercise.name}</span>
        )}
        {item.is_pr && <Pill tone="accent">PR</Pill>}
      </div>
      <div className="relative overflow-x-auto rounded-md border border-ink3">
        <table aria-label={`Series de ${item.exercise.name}`} className="w-full min-w-[260px] border-collapse">
          <thead>
            <tr>
              <th scope="col" className={TH}>
                #
              </th>
              <th scope="col" className={TH}>
                Reps
              </th>
              <th scope="col" className={TH}>
                Kg
              </th>
            </tr>
          </thead>
          <tbody>
            {item.sets.map((set) => (
              <SetRow key={set.id} set={set} planned={item.planned} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Note({ label, text }) {
  return (
    <div className="mt-4">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink6">{label}</div>
      <p className="whitespace-pre-line break-words font-body text-sm text-bone1">{text}</p>
    </div>
  );
}

/**
 * Series de la sesión (real contra plan), nota del alumno y comentario; el detalle se pide al montarse.
 * Para el entrenador, el comentario se edita (`SessionComment`). Para el alumno (`viewer="student"`), la nota es
 * "Tu nota" y el comentario del entrenador, si lo hay, es de solo lectura: el PATCH es solo del entrenador.
 */
export default function SessionDetail({ studentId, session, viewer = 'trainer' }) {
  const isStudent = viewer === 'student';
  const query = useSessionDetail(studentId, session.id);
  return (
    <div className="min-w-0 pt-3">
      <QueryState query={query} errorMessage="No pudimos cargar el detalle de la sesión.">
        {(detail) => (
          <div className="flex flex-col gap-4">
            {detail.exercises.length === 0 && <p className="text-sm text-bone2">Sin series registradas</p>}
            {detail.exercises.map((item, index) => (
              <ExerciseBlock key={`${item.exercise.id}-${index}`} item={item} />
            ))}
          </div>
        )}
      </QueryState>
      {session.notes && <Note label={isStudent ? 'Tu nota' : 'Nota del alumno'} text={session.notes} />}
      {isStudent ? (
        session.trainer_comment && <Note label="Comentario de tu entrenador" text={session.trainer_comment} />
      ) : (
        <SessionComment key={session.trainer_comment ?? ''} studentId={studentId} session={session} />
      )}
    </div>
  );
}
