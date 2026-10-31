import { useState } from 'react';
import { goalLabel } from '@/utils/challenges/challengeFormat';
import { formatDayMonthAR } from '@/utils/dates';

const STATUS_LABEL = { completed: 'Completado', failed: 'Vencido', abandoned: 'Abandonado' };

const BAR_COLOR = { active: 'bg-accentText', completed: 'bg-good', failed: 'bg-ink5', abandoned: 'bg-ink5' };

function ChallengeRow({ assignment }) {
  const { challenge, status, ends_at: endsAt, progress_pct: pct } = assignment;
  const active = status === 'active';
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-body text-sm font-medium text-bone0">{challenge.name}</span>
        <span className="font-mono text-xs text-ink6">
          {active ? `termina el ${formatDayMonthAR(endsAt)}` : STATUS_LABEL[status]}
        </span>
      </div>
      <span className="font-body text-xs text-ink6">{goalLabel(challenge)}</span>
      <div
        role="progressbar"
        aria-label={`Progreso de ${challenge.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-1.5 overflow-hidden rounded-pill bg-ink3"
      >
        <div className={`h-full ${BAR_COLOR[status]}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
    </li>
  );
}

const List = ({ items }) => (
  <ul className="flex flex-col gap-3.5">
    {items.map((a) => (
      <ChallengeRow key={a.id} assignment={a} />
    ))}
  </ul>
);

/** Desafíos activos con su barra; el resto, en un "Historial (N)" colapsado. */
export default function ChallengeProgressList({ items }) {
  const [open, setOpen] = useState(false);
  const active = items.filter((a) => a.status === 'active');
  const history = items.filter((a) => a.status !== 'active');
  return (
    <div className="flex flex-col gap-3.5">
      {active.length > 0 ? <List items={active} /> : <p className="font-body text-sm text-ink6">Sin desafíos activos</p>}
      {history.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="self-start font-display text-xs font-semibold text-accentText hover:underline"
          >
            Historial ({history.length})
          </button>
          {open && <List items={history} />}
        </div>
      )}
    </div>
  );
}
