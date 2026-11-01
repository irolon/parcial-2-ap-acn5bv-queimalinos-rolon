import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { studentRoutineHref } from '@/routes/routeTable';
import { exerciseCount } from '@/utils/routines/todayPlan';
import { formatRoutineDaysShort } from '@/utils/students/routineDays';

/** Una rutina de "Mis rutinas": nombre, días abreviados ("Lun · Mié · Vie") y cantidad de ejercicios; lleva al detalle. */
export default function RoutineCard({ routine }) {
  const days = formatRoutineDaysShort(routine.days);
  return (
    <li>
      <Link
        to={studentRoutineHref(routine.routine_id)}
        className="flex items-center gap-3 rounded-xl border border-ink2 bg-ink1 p-5 transition-colors hover:border-ink4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText"
      >
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[17px] font-semibold text-bone0">{routine.name}</h3>
          {days && <p className="mt-1 font-mono text-[11px] text-ink6">{days}</p>}
          <p className="mt-1 font-body text-sm text-ink6">{exerciseCount(routine.exercises)}</p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-ink5" aria-hidden="true" />
      </Link>
    </li>
  );
}
