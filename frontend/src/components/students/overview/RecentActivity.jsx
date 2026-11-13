import { Link } from 'react-router';
import LoadingState from '@/components/shared/states/LoadingState';
import Avatar from '@/components/shared/ui/Avatar';
import Card from '@/components/shared/ui/Card';
import { profileHref } from '@/routes/routeTable';
import { relativeTime } from '@/utils/students/overviewFormat';
import LiveDot from './LiveDot';

const ROW = 'flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-white/[0.04]';

function Who({ name, routineName }) {
  return (
    <>
      <Avatar name={name} size={32} decorative />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-sm font-semibold text-bone0">{name}</span>
        <span className="block truncate font-body text-xs text-ink6">{routineName ?? 'Sin rutina'}</span>
      </span>
    </>
  );
}

/** Una sesión abierta (`overview.in_session`): punto verde y "En curso · hace 12 min". */
function LiveRow({ session, now }) {
  return (
    <li>
      <Link to={profileHref(session.student_id)} aria-label={`${session.name}, entrenando ahora`} className={ROW}>
        <LiveDot />
        <Who name={session.name} routineName={session.routine_name} />
        <span className="shrink-0 text-right font-mono text-[11px] text-good">
          En curso · {relativeTime(session.started_at, now)}
        </span>
      </Link>
    </li>
  );
}

function Row({ session, now }) {
  return (
    <li>
      <Link to={profileHref(session.student_id)} className={ROW}>
        <Who name={session.name} routineName={session.routine_name} />
        <span className="shrink-0 font-mono text-[11px] text-bone0">RPE {session.rpe ?? '—'}</span>
        <span className="w-24 shrink-0 text-right font-mono text-[11px] text-ink6">
          {relativeTime(session.finished_at, now)}
        </span>
      </Link>
    </li>
  );
}

/**
 * Arriba, los que están entrenando ahora (`overview.in_session`); después, las últimas sesiones terminadas
 * (`overview.recent`). Cada fila linkea a la ficha. Sin `recent`, cargando.
 */
export default function RecentActivity({ recent, inSession = [] }) {
  const now = new Date();
  if (!recent) return <Card title="Actividad reciente"><LoadingState rows={3} label="Cargando el resumen…" /></Card>;
  return (
    <Card title="Actividad reciente">
      {inSession.length + recent.length > 0 && (
        <ul className="flex flex-col divide-y divide-ink2">
          {inSession.map((session) => <LiveRow key={session.session_id} session={session} now={now} />)}
          {recent.map((session) => <Row key={session.session_id} session={session} now={now} />)}
        </ul>
      )}
      {recent.length === 0 && <p className="font-body text-sm text-ink6">Todavía nadie terminó una sesión</p>}
    </Card>
  );
}
