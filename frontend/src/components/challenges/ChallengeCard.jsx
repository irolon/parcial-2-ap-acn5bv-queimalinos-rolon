import Button from '@/components/shared/ui/Button';
import Pill from '@/components/shared/ui/Pill';
import { plural } from '@/utils/shared/plural';
import { durationLabel, goalLabel } from '@/utils/challenges/challengeFormat';

/** Un desafío con su meta, duración y marcas; "Borrar" solo en propios sin asignaciones. */
export default function ChallengeCard({ challenge, onAssign, onDelete }) {
  const isOwn = challenge.trainer_id !== null;
  const canDelete = isOwn && challenge.assignments_count === 0;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 font-body text-sm">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-display text-[15px] font-semibold text-bone0">{challenge.name}</span>
        <span className="text-ink6">{`${goalLabel(challenge)} · ${durationLabel(challenge.duration_days)}`}</span>
        <div className="flex flex-wrap gap-2 empty:hidden">
          {challenge.reward_achievement_id && <Pill tone="good">Desafío cumplido</Pill>}
          {challenge.active_count > 0 && <Pill tone="cool">{plural(challenge.active_count, 'activo', 'activos')}</Pill>}
        </div>
      </div>
      <div className="flex gap-2">
        {canDelete && (
          <Button variant="ghost" size="sm" onClick={() => onDelete(challenge)}>
            Borrar
          </Button>
        )}
        <Button size="sm" onClick={() => onAssign(challenge)}>
          Asignar
        </Button>
      </div>
    </li>
  );
}
