import Card from '@/components/shared/ui/Card';
import Stat from '@/components/shared/ui/Stat';
import { formatBmi, formatDelta, formatNumber, metricDelta } from '@/utils/body-metrics/metrics';

const STATS = [
  { field: 'weight_kg', label: 'Peso', unit: 'kg' },
  { field: 'height_cm', label: 'Talla', unit: 'cm' },
  { field: 'body_fat_pct', label: '% grasa', unit: '%' },
  { field: 'bmi', label: 'IMC' },
  { field: 'waist_cm', label: 'Cintura', unit: 'cm' },
  { field: 'hip_cm', label: 'Cadera', unit: 'cm' },
  { field: 'chest_cm', label: 'Pecho', unit: 'cm' },
];

/** Última medida con la diferencia contra la anterior. El IMC viene del backend y su diferencia no lleva unidad. */
export default function AnthropometryCard({ latest, previous, extra }) {
  return (
    <Card title="Antropometría" extra={extra}>
      {latest ? (
        <div className="grid grid-cols-2 gap-4">
          {STATS.map(({ field, label, unit }) => {
            const value = latest[field];
            const delta = metricDelta(latest, previous, field);
            return (
              <Stat
                key={field}
                label={label}
                value={value == null ? '—' : (field === 'bmi' ? formatBmi : formatNumber)(value)}
                unit={value == null ? undefined : unit}
                delta={delta === null ? undefined : formatDelta(delta, unit)}
              />
            );
          })}
        </div>
      ) : (
        <p className="font-body text-sm text-ink6">Todavía no hay medidas</p>
      )}
    </Card>
  );
}
