import { Link } from 'react-router';
import Avatar from '@/components/shared/ui/Avatar';
import { profileHref } from '@/routes/routeTable';
import { activityStatus, lastSessionLabel } from '@/utils/students/activity';
import { goalLabel } from '@/utils/students/studentOptions';
import StudentStatusPill from './StudentStatusPill';

/** Tarjeta del alumno; el link a la ficha conserva la búsqueda (`search`, sin `?`) del panel. */
export default function StudentCard({ student, now, search }) {
  const status = activityStatus(student, now);
  const inactive = status === 'inactive';
  return (
    <li>
      <Link
        to={profileHref(student.id, search)}
        className={`flex h-full items-center gap-3 rounded-xl border bg-ink1 p-4 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-accentText ${
          inactive ? 'border-hot/40' : 'border-ink3'
        }`}
      >
        <Avatar name={student.name} size={44} tone={inactive ? 'hot' : undefined} decorative />
        <span className="min-w-0 flex-1">
          <span title={student.name} className="block truncate font-display text-sm font-semibold text-bone0">
            {student.name}
          </span>
          <span className="block truncate font-body text-xs text-ink6">{goalLabel(student.goal) ?? 'Sin objetivo'}</span>
          <span className="mt-1 block font-mono text-[11px] text-ink6">
            Última sesión: {lastSessionLabel(student, now)}
          </span>
        </span>
        <StudentStatusPill status={status} />
      </Link>
    </li>
  );
}
