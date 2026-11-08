import CommitmentKpis, { CommitmentState } from '@/components/students/commitment/CommitmentKpis';
import Card from '@/components/shared/ui/Card';
import { useCommitment } from '@/hooks/students/useCommitment';
import { plural } from '@/utils/shared/plural';
import { formatRpe, monthName } from '@/utils/students/commitment';

function rpeContext({ rpe, rpeFailed }) {
  if (rpeFailed || rpe === undefined) return undefined;
  return rpe ? `de ${plural(rpe.count, 'sesión', 'sesiones')}` : 'Sin RPE cargado';
}

function items(commitment) {
  const { attendance, streak, rpe } = commitment;
  return [
    {
      label: 'Sesiones del mes',
      value: `${attendance.sessions}/${attendance.assigned_days}`,
      context: 'sobre planificadas',
    },
    {
      label: 'Racha',
      value: streak.current_streak_days,
      unit: streak.current_streak_days === 1 ? 'día' : 'días',
      context: `Mejor: ${streak.longest_streak_days}`,
    },
    {
      label: 'RPE promedio',
      value: rpe ? formatRpe(rpe.average) : '—',
      context: rpeContext(commitment),
      hint: rpe?.partial ? 'Promedio de las últimas 20 sesiones del mes' : undefined,
    },
    { label: 'Récords', value: attendance.prs, context: 'este mes' },
  ];
}

/** Ficha del alumno: sesiones del mes sobre planificadas, racha, RPE promedio y récords (los números del celular). */
export default function TrainerCommitmentCard({ studentId }) {
  const commitment = useCommitment(studentId, { withRpe: true });
  const title = `Compromiso · ${monthName(commitment.month)}`;
  return (
    <Card title={title} role="region" aria-label={title}>
      <CommitmentState commitment={commitment} loadingLabel="Cargando indicadores…">
        {() => <CommitmentKpis items={items(commitment)} />}
      </CommitmentState>
    </Card>
  );
}
