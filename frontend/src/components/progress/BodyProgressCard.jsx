import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import Stat from '@/components/shared/ui/Stat';
import { useBodyProgress } from '@/hooks/progress/useProgress';
import { MY_PROFILE_PATH } from '@/routes/routeTable';
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

function NoMetrics({ viewer }) {
  return (
    <p className="font-body text-sm text-ink6">
      Todavía no hay medidas cargadas.{' '}
      {viewer === 'student' ? (
        <>
          Podés cargarlas desde{' '}
          <Link to={MY_PROFILE_PATH} className="font-semibold text-accentText hover:underline">
            Mi perfil
          </Link>
        </>
      ) : (
        'Tu entrenador o vos pueden cargarlas desde la app'
      )}
    </p>
  );
}

/**
 * Peso en el tiempo y variación de peso, % de grasa y cintura (primera vs. última medida). `viewer` es quién mira
 * (`'trainer'` por defecto o `'student'`) y solo cambia lo que dice sin medidas: el alumno las carga desde Mi perfil.
 */
export default function BodyProgressCard({ studentId, viewer = 'trainer' }) {
  const query = useBodyProgress(studentId);
  const title = 'Peso corporal y medidas';
  if (query.isPending) return <Card title={title}><LoadingState /></Card>;
  // Un refetch fallido no tapa las medidas que ya cargaron: solo se ve el error si no hay nada que mostrar.
  if (query.isError && query.data == null) {
    return <Card title={title}><ErrorState message={query.error?.message} onRetry={() => query.refetch()} /></Card>;
  }
  const { points, summary } = query.data;
  // weightSeries trae el instante; para el eje y el tooltip se usa el día local (YYYY-MM-DD).
  const series = weightSeries(points).map((p) => ({ ...p, date: todayString(new Date(p.date)) }));
  const hasAny = FIELDS.some((f) => summary?.[f.key]);
  return (
    <Card title={title}>
      {!hasAny ? (
        <NoMetrics viewer={viewer} />
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
