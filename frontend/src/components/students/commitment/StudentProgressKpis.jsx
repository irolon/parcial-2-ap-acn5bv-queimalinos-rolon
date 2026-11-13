import CommitmentKpis, { CommitmentState } from '@/components/students/commitment/CommitmentKpis';
import { useCommitment } from '@/hooks/students/useCommitment';
import { formatVolume } from '@/utils/progress/format';
import { plural, pluralNoun } from '@/utils/shared/plural';
import { unplannedContext } from '@/utils/students/commitment';

const days = (n) => plural(n, 'día', 'días');
const deltaLabel = (pct) => `${pct >= 0 ? `+${pct}` : `−${-pct}`}% vs. las 4 semanas anteriores`;

function items({ attendance, streak, volume }) {
  const planned = attendance.assigned_days > 0;
  const current = streak.current_streak_days;
  const { prs } = attendance;
  return [
    {
      label: 'Sesiones del mes',
      value: attendance.sessions,
      unit: planned ? `/${attendance.assigned_days}` : null,
      accent: planned,
      context: planned ? `de ${days(attendance.assigned_days)} planificados` : unplannedContext(attendance),
    },
    {
      label: 'Racha',
      value: current,
      unit: pluralNoun(current, 'día', 'días'),
      context: current === 0 ? 'Arrancá hoy' : `Tu mejor racha: ${days(streak.longest_streak_days)}`,
    },
    {
      label: 'Récords del mes',
      value: prs,
      context: prs === 0 ? 'Todavía ninguno este mes' : `${pluralNoun(prs, 'sesión', 'sesiones')} con récord`,
    },
    {
      label: 'Volumen · 4 semanas',
      value: volume ? formatVolume(volume.total) : '—',
      delta: volume && volume.deltaPct !== null ? deltaLabel(volume.deltaPct) : undefined,
    },
  ];
}

/** "Mi progreso": sesiones del mes, racha, récords del mes y volumen de 4 semanas del propio alumno. */
export default function StudentProgressKpis({ studentId }) {
  const commitment = useCommitment(studentId, { withVolume: true });
  return (
    <section aria-label="Tus indicadores">
      <CommitmentState commitment={commitment} loadingLabel="Cargando tus indicadores…">
        {() => <CommitmentKpis items={items(commitment)} />}
      </CommitmentState>
    </section>
  );
}
