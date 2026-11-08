import CommitmentKpis, { CommitmentState } from '@/components/students/commitment/CommitmentKpis';
import { useCommitment } from '@/hooks/students/useCommitment';
import { durationLabel } from '@/utils/challenges/challengeFormat';
import { formatVolume } from '@/utils/progress/format';

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
      context: planned ? `de ${durationLabel(attendance.assigned_days)} planificados` : 'Sin plan este mes',
    },
    {
      label: 'Racha',
      value: current,
      unit: current === 1 ? 'día' : 'días',
      context: current === 0 ? 'Arrancá hoy' : `Tu mejor racha: ${durationLabel(streak.longest_streak_days)}`,
    },
    {
      label: 'Récords del mes',
      value: prs,
      context: prs === 0 ? 'Todavía ninguno este mes' : `${prs === 1 ? 'sesión' : 'sesiones'} con récord`,
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
