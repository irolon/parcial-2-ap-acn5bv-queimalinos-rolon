import CommitmentKpis, { CommitmentState } from '@/components/students/commitment/CommitmentKpis';
import Card from '@/components/shared/ui/Card';
import { useCommitment } from '@/hooks/students/useCommitment';
import { plural, pluralNoun } from '@/utils/shared/plural';
import { formatRpe, monthName } from '@/utils/students/commitment';

/** El RPE: cargando (el historial todavía no llegó), no disponible (falló), sin datos o el promedio. */
function rpeItem({ rpe, rpeFailed }) {
  const item = { label: 'RPE promedio', value: '—' };
  if (rpeFailed) return { ...item, context: 'No disponible' };
  if (rpe === undefined) return { ...item, value: '…', context: 'Cargando…' };
  if (!rpe) return { ...item, context: 'Sin RPE cargado' };
  return {
    ...item,
    value: formatRpe(rpe.average),
    context: `de ${plural(rpe.count, 'sesión', 'sesiones')}`,
    hint: rpe.partial ? 'Promedio de las últimas 20 sesiones del mes' : undefined,
  };
}

function items(commitment) {
  const { attendance, streak } = commitment;
  const planned = attendance.assigned_days > 0;
  return [
    {
      label: 'Sesiones del mes',
      value: planned ? `${attendance.sessions}/${attendance.assigned_days}` : attendance.sessions,
      context: planned ? 'sobre planificadas' : 'Sin plan este mes',
    },
    {
      label: 'Racha',
      value: streak.current_streak_days,
      unit: pluralNoun(streak.current_streak_days, 'día', 'días'),
      context: `Mejor: ${streak.longest_streak_days}`,
    },
    rpeItem(commitment),
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
