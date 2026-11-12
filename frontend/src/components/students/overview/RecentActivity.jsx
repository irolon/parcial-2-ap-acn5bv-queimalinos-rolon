import { Link } from 'react-router';
import LoadingState from '@/components/shared/states/LoadingState';
import Avatar from '@/components/shared/ui/Avatar';
import Card from '@/components/shared/ui/Card';
import { profileHref } from '@/routes/routeTable';
import { relativeTime } from '@/utils/students/overviewFormat';

function Row({ session, now }) {
  return (
    <li>
      <Link
        to={profileHref(session.student_id)}
        className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-white/[0.04]"
      >
        <Avatar name={session.name} size={32} decorative />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-semibold text-bone0">{session.name}</span>
          <span className="block truncate font-body text-xs text-ink6">{session.routine_name ?? 'Sin rutina'}</span>
        </span>
        <span className="shrink-0 font-mono text-[11px] text-bone0">RPE {session.rpe ?? '—'}</span>
        <span className="w-24 shrink-0 text-right font-mono text-[11px] text-ink6">
          {relativeTime(session.finished_at, now)}
        </span>
      </Link>
    </li>
  );
}

/** Las últimas sesiones terminadas (`overview.recent`), cada una con link a la ficha. Sin `recent`, cargando. */
export default function RecentActivity({ recent }) {
  const now = new Date();
  let body;
  if (!recent) body = <LoadingState rows={3} label="Cargando el resumen…" />;
  else if (recent.length === 0) body = <p className="font-body text-sm text-ink6">Todavía nadie terminó una sesión</p>;
  else {
    body = (
      <ul className="flex flex-col divide-y divide-ink2">
        {recent.map((session) => (
          <Row key={session.session_id} session={session} now={now} />
        ))}
      </ul>
    );
  }
  return <Card title="Actividad reciente">{body}</Card>;
}
