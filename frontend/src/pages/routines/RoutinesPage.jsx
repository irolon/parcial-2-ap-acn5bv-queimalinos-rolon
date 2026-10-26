import { Link } from 'react-router';
import { List } from 'lucide-react';
import QueryState from '@/components/shared/states/QueryState';
import { useRoutinesQuery } from '@/hooks/routines/useRoutines';
import { useStudentsQuery } from '@/hooks/students/useStudents';
import { NEW_ROUTINE, profileHref } from '@/routes/routeTable';
import { formatRoutineDays } from '@/utils/students/routineDays';

const LINK_CLASS =
  'inline-flex h-11 items-center rounded-lg bg-accent px-[18px] font-display text-sm font-semibold text-accentInk hover:bg-accentDim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText';

function StudentCell({ routine, students }) {
  const student = students?.find((s) => s.id === routine.student_id);
  if (!student) return <span className="text-ink6">Alumno dado de baja</span>;
  return (
    <Link to={profileHref(student.id)} className="text-bone0 hover:underline">
      {student.name}
    </Link>
  );
}

function RoutineRow({ routine, students }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 font-body text-sm">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-display text-[15px] font-semibold text-bone0">{routine.name}</span>
        <StudentCell routine={routine} students={students} />
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
  const students = useStudentsQuery({ active: true });
  const isEmpty = query.isSuccess && query.data.length === 0;
  const newRoutine = (
    <Link to={NEW_ROUTINE.path} className={LINK_CLASS}>
      Nueva rutina
    </Link>
  );
  return (
    <section className="flex flex-col gap-5">
      {!isEmpty && <div className="flex justify-end">{newRoutine}</div>}
      <QueryState query={query} empty={{ icon: List, title: 'Todavía no armaste rutinas' }}>
        {(routines) => (
          <ul className="flex flex-col gap-3">
            {routines.map((r) => (
              <RoutineRow key={r.id} routine={r} students={students.data} />
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
