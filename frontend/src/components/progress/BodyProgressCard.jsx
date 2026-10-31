import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import Stat from '@/components/shared/ui/Stat';
import { useBodyProgress } from '@/hooks/progress/useProgress';
import { formatDelta, formatNumber, formatWeight, weightSeries } from '@/utils/body-metrics/metrics';
import { todayString } from '@/utils/dates';
import { formatLongDate, formatShortDate } from '@/utils/progress/format';
import { AXIS, GRID, TooltipBox } from './chartStyle';

const FIELDS = [
  { key: 'weight_kg', label: 'Peso', unit: 'kg' },
  { key: 'body_fat_pct', label: '% grasa', unit: '%' },
  { key: 'waist_cm', label: 'Cintura', unit: 'cm' },
];

export function WeightTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return <TooltipBox title={formatLongDate(p.date)} rows={[`Peso: ${formatWeight(p.weight)}`]} />;
}

function Deltas({ summary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {FIELDS.map(({ key, label, unit }) => {
        const s = summary?.[key];
        return (
          <div key={key}>
            <Stat label={label} value={s ? formatNumber(s.last) : '—'} unit={s ? unit : undefined} />
            {s && s.first !== s.last && (
              <div className="mt-1 font-mono text-[11px] text-ink6">{formatDelta(s.delta, unit)} desde el inicio</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Peso en el tiempo y variación de peso, % de grasa y cintura (primera vs. última medida). */
export default function BodyProgressCard({ studentId }) {
  const query = useBodyProgress(studentId);
  const title = 'Peso corporal y medidas';
  if (query.isPending) return <Card title={title}><LoadingState /></Card>;
  if (query.isError) {
    return <Card title={title}><ErrorState message={query.error?.message} onRetry={() => query.refetch()} /></Card>;
  }
  const { points, summary } = query.data;
  // weightSeries trae el instante; para el eje y el tooltip se usa el día local (YYYY-MM-DD).
  const series = weightSeries(points).map((p) => ({ ...p, date: todayString(new Date(p.date)) }));
  const hasAny = FIELDS.some((f) => summary?.[f.key]);
  return (
    <Card title={title}>
      {!hasAny ? (
        <p className="font-body text-sm text-ink6">
          Todavía no hay medidas cargadas. Tu entrenador o vos pueden cargarlas desde la app
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <Deltas summary={summary} />
          {series.length >= 2 && (
            <div role="img" aria-label="Evolución del peso corporal" className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} {...AXIS} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} width={44} {...AXIS} />
                  <Tooltip content={<WeightTooltip />} />
                  <Line type="monotone" dataKey="weight" stroke="var(--color-accentText)" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
