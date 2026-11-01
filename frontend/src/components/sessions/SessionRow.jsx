import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Pill from '@/components/shared/ui/Pill';
import SessionDetail from '@/components/sessions/SessionDetail';
import { formatDuration, formatSessionDate } from '@/utils/sessions/format';

/**
 * Fila del historial (grilla del prototipo; en < 640 px baja a dos líneas) con detalle expandible.
 * `viewer` (`'trainer'` o `'student'`) solo se le pasa al detalle.
 */
export default function SessionRow({ studentId, session, viewer = 'trainer' }) {
  const [open, setOpen] = useState(false);
  const panelId = `session-detail-${session.id}`;
  const text = session.trainer_comment || session.notes;
  const modified = session.has_modifications;

  return (
    <li className={`border-b border-ink2 py-3 last:border-b-0 ${modified ? 'border-l-2 border-l-hot pl-3' : ''}`}>
      <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-start gap-x-3.5 gap-y-1.5 sm:grid-cols-[64px_minmax(0,1fr)_80px_60px]">
        <div className="col-start-1 row-start-1 font-mono text-[10px]">
          <div className="text-ink6">{formatSessionDate(session.started_at)}</div>
          <div className="text-ink5">{formatDuration(session.duration_min)}</div>
        </div>
        <div className="col-span-3 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
            <span className="font-display text-[13px] font-medium text-bone0">
              {session.routine?.name ?? 'Sesión libre'}
            </span>
            {session.has_pr && <Pill tone="accent">PR</Pill>}
            {modified && <Pill tone="hot">Modificada</Pill>}
          </div>
          {text && <div className="break-words font-body text-[11px] leading-[1.4] text-ink6">{text}</div>}
        </div>
        <div className="col-start-2 row-start-1 justify-self-end font-mono text-[10px] text-ink6 sm:col-start-3 sm:justify-self-auto">
          {session.rpe == null ? (
            '—'
          ) : (
            <>
              RPE{' '}
              <span className={`font-display text-sm font-semibold ${session.rpe >= 8 ? 'text-hot' : 'text-bone0'}`}>
                {session.rpe}
              </span>
              /10
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="col-start-3 row-start-1 !h-7 !text-[11px] sm:col-start-4"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          Detalle
        </Button>
      </div>
      {open && (
        <div id={panelId}>
          <SessionDetail studentId={studentId} session={session} viewer={viewer} />
        </div>
      )}
    </li>
  );
}
