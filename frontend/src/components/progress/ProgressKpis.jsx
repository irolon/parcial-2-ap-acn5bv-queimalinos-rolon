import Card from '@/components/shared/ui/Card';
import Stat from '@/components/shared/ui/Stat';
import { formatKg, formatVolume } from '@/utils/progress/format';
import { recordFor } from '@/utils/progress/metrics';

/** Sesiones y volumen del rango, y récord del ejercicio. */
export default function ProgressKpis({ weeks, pr, metric }) {
  const sessions = weeks.reduce((sum, w) => sum + w.sessions, 0);
  const volume = weeks.reduce((sum, w) => sum + w.volume_kg, 0);
  // Con volumen o repeticiones no hay récord propio: se muestra el de 1RM (o el de peso máximo).
  const record = recordFor(pr, metric) ?? recordFor(pr, 'e1rm_kg') ?? recordFor(pr, 'max_kg');
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
