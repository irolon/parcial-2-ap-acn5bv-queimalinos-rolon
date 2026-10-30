import Card from '@/components/shared/ui/Card';
import Stat from '@/components/shared/ui/Stat';
import { formatKg, formatVolume } from '@/utils/progress/format';

/** Récord a mostrar: el de la métrica de kg elegida; con volumen/reps, 1RM si existe y si no peso máximo. */
function pickRecord(pr, metric) {
  if (metric === 'e1rm_kg') return pr?.e1rm_kg ?? null;
  if (metric === 'max_kg') return pr?.max_kg ?? null;
  return pr?.e1rm_kg ?? pr?.max_kg ?? null;
}

/** Sesiones y volumen del rango, y récord del ejercicio. */
export default function ProgressKpis({ weeks, pr, metric }) {
  const sessions = weeks.reduce((sum, w) => sum + w.sessions, 0);
  const volume = weeks.reduce((sum, w) => sum + w.volume_kg, 0);
  const record = pickRecord(pr, metric);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card padding={16}>
        <Stat label="Sesiones" value={sessions} />
      </Card>
      <Card padding={16}>
        <Stat label="Volumen" value={formatVolume(volume)} />
      </Card>
      <Card padding={16}>
        <Stat label="Récord" value={record ? formatKg(record.value) : '—'} accent={Boolean(record)} />
      </Card>
    </div>
  );
}
