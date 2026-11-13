import { Link } from 'react-router';
import StreakLabel from '@/components/achievements/StreakLabel';
import Avatar from '@/components/shared/ui/Avatar';
import { profileHref } from '@/routes/routeTable';
import { arParts } from '@/utils/agenda/time';
import { pad } from '@/utils/dates';
import { activityStatus, lastSessionLabel } from '@/utils/students/activity';
import { goalLabel } from '@/utils/students/studentOptions';
import AdherenceBar from './AdherenceBar';
import LiveDot from './overview/LiveDot';
import StudentStatusPill from './StudentStatusPill';

/** Con una sesión abierta (`open_session`, GX4): punto verde y "Entrenando ahora"; si no, la última sesión. */
function SessionLine({ student, now }) {
  if (!student.open_session) {
    return <span className="mt-1 block font-mono text-[11px] text-ink6">Última sesión: {lastSessionLabel(student, now)}</span>;
  }
  const { hour, minute } = arParts(student.open_session.started_at);
  return (
    <span title={`Empezó a las ${pad(hour)}:${pad(minute)}`} className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-good">
      <LiveDot />
      Entrenando ahora
    </span>
  );
}

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
          <SessionLine student={student} now={now} />
          <span className="block font-mono text-[11px] text-ink6">
            <StreakLabel streak={student.streak} />
          </span>
          <AdherenceBar student={student} />
        </span>
        <StudentStatusPill status={status} />
      </Link>
    </li>
  );
}
