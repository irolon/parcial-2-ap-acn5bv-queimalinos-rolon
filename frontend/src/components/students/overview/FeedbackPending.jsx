import { Link } from 'react-router';
import LoadingState from '@/components/shared/states/LoadingState';
import Avatar from '@/components/shared/ui/Avatar';
import Card from '@/components/shared/ui/Card';
import { profileHref } from '@/routes/routeTable';
import { daysAgoLabel } from '@/utils/students/overviewFormat';

/** Cuántas sesiones se listan; el resto se resume en "y N más". */
export const FEEDBACK_LIMIT = 5;

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
        <span className="w-16 shrink-0 text-right font-mono text-[11px] text-ink6">
          {daysAgoLabel(session.finished_at, now)}
        </span>
      </Link>
    </li>
  );
}

/**
 * "Feedback pendiente" (`overview.lists.feedback_pending`): sesiones terminadas en los últimos 7 días, contando hoy,
 * sin comentario del entrenador. Hasta `FEEDBACK_LIMIT`, cada una con link a la ficha. Sin `pending`, cargando.
 */
export default function FeedbackPending({ pending }) {
  const now = new Date();
  let body;
  if (!pending) body = <LoadingState rows={2} label="Cargando el resumen…" />;
  else if (pending.length === 0) {
    body = <p className="font-body text-sm text-ink6">Comentaste todas las sesiones de los últimos 7 días.</p>;
  } else {
    const rest = pending.length - FEEDBACK_LIMIT;
    body = (
      <>
        <ul className="flex flex-col divide-y divide-ink2">
          {pending.slice(0, FEEDBACK_LIMIT).map((session) => (
            <Row key={session.session_id} session={session} now={now} />
          ))}
        </ul>
        {rest > 0 && <p className="mt-2 px-2 font-mono text-[11px] text-ink6">y {rest} más</p>}
      </>
    );
  }
  return <Card title="Feedback pendiente">{body}</Card>;
}
