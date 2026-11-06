import { Link } from 'react-router';
import { List, Sparkles } from 'lucide-react';
import QueryState from '@/components/shared/states/QueryState';
import { useRoutinesQuery } from '@/hooks/routines/useRoutines';
import { AI_ROUTINE, NEW_ROUTINE, profileHref } from '@/routes/routeTable';
import { STATUS_LABELS } from '@/utils/students/activity';
import { formatRoutineDays } from '@/utils/students/routineDays';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText';
const LINK_CLASS =
  `inline-flex h-11 items-center rounded-lg bg-accent px-[18px] font-display text-sm font-semibold text-accentInk hover:bg-accentDim ${FOCUS}`;
const AI_LINK_CLASS =
  `inline-flex h-11 items-center gap-2 rounded-lg border border-white/[0.14] px-[18px] font-display text-sm font-semibold text-bone0 hover:bg-white/[0.06] ${FOCUS}`;

/** Alumno de la rutina (`routine.student` viene embebido en el listado). */
function StudentCell({ routine }) {
  const student = routine.student;
  if (!student) return <span className="text-ink6">Alumno no disponible</span>;
  const isDeactivated = student.active === false;
  return (
    <span className="flex items-center gap-2">
      <Link to={profileHref(routine.student_id, isDeactivated ? 'estado=baja' : '')} className="text-bone0 hover:underline">
        {student.name}
      </Link>
      {isDeactivated && <span className="font-mono text-xs text-ink6">{STATUS_LABELS.disabled}</span>}
    </span>
  );
}

function RoutineRow({ routine }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 font-body text-sm">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-display text-[15px] font-semibold text-bone0">{routine.name}</span>
        <StudentCell routine={routine} />
      </div>
      <span className="text-ink6">{formatRoutineDays(routine.days)}</span>
      <span className={routine.active ? 'text-accentText' : 'text-ink6'}>
        {routine.active ? 'Activa' : 'Inactiva'}
      </span>
    </li>
  );
}

/** Listado de rutinas del entrenador con su alumno, días y estado. */
export default function RoutinesPage() {
  const query = useRoutinesQuery();
  const isEmpty = query.isSuccess && query.data.length === 0;
  const newRoutine = (
    <div className="flex flex-wrap gap-3">
      <Link to={AI_ROUTINE.path} className={AI_LINK_CLASS}>
        <Sparkles size={16} aria-hidden="true" />
        Rutina con IA
      </Link>
      <Link to={NEW_ROUTINE.path} className={LINK_CLASS}>
        Nueva rutina
      </Link>
    </div>
  );
  return (
    <section className="flex flex-col gap-5">
      {!isEmpty && <div className="flex justify-end">{newRoutine}</div>}
      <QueryState query={query} empty={{ icon: List, title: 'Todavía no armaste rutinas' }}>
        {(routines) => (
          <ul className="flex flex-col gap-3">
            {routines.map((r) => (
              <RoutineRow key={r.id} routine={r} />
            ))}
          </ul>
        )}
      </QueryState>
      {isEmpty && (
        <div className="flex justify-center">{newRoutine}</div>
      )}
    </section>
  );
}
