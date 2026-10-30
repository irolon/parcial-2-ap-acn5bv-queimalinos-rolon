import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Card from '@/components/shared/ui/Card';
import Pill from '@/components/shared/ui/Pill';
import { dateToTime, formatLongDate, formatMetric, formatShortDate, timeToDate } from '@/utils/progress/format';
import { METRICS, MIN_POINTS, metricOptions, recordFor } from '@/utils/progress/metrics';
import MetricSelector from './MetricSelector';
import NotEnoughData from './NotEnoughData';
import { AXIS, GRID, TooltipBox } from './chartStyle';

export function CurveTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const label = METRICS.find((m) => m.value === metric)?.label;
  return (
    <TooltipBox
      title={formatLongDate(p.date)}
      rows={[`${label}: ${formatMetric(metric, p[metric])}`, `${p.sets} ${p.sets === 1 ? 'serie' : 'series'} · ${p.reps} reps`]}
    />
  );
}

/** Curva de progreso de un ejercicio, con la métrica elegida y el punto del récord resaltado. */
export default function ExerciseCurveCard({ data, metric, onMetricChange }) {
  const { exercise, points, pr } = data;
  const valid = points.filter((p) => p[metric] !== null && p[metric] !== undefined);
  const record = recordFor(pr, metric);
  // Eje de tiempo real: los días sin entrenar quedan proporcionalmente vacíos.
  const series = points.map((p) => ({ ...p, time: dateToTime(p.date) }));
  const dot = ({ cx, cy, payload, index }) => {
    const isPr = record && payload.date === record.date;
    if (cx == null || cy == null) return <g key={index} />;
    return (
      <circle
        key={index}
        cx={cx}
        cy={cy}
        r={isPr ? 6 : 3.5}
        fill={isPr ? 'var(--color-hot)' : 'var(--color-accent)'}
        stroke="var(--color-ink1)"
        strokeWidth={1.5}
        className="recharts-dot recharts-line-dot"
      />
    );
  };
  return (
    <Card title={exercise.name} extra={record && <Pill tone="hot">Récord {formatMetric(metric, record.value)}</Pill>}>
      <div className="mb-3">
        <MetricSelector value={metric} options={metricOptions(points)} onChange={onMetricChange} />
      </div>
      {valid.length < MIN_POINTS ? (
        <NotEnoughData count={valid.length} exerciseName={exercise.name} />
      ) : (
        <div role="img" aria-label={`Progresión de ${exercise.name}`} className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t) => formatShortDate(timeToDate(t))}
                {...AXIS}
              />
              <YAxis domain={['auto', 'auto']} width={48} {...AXIS} />
              <Tooltip content={<CurveTooltip metric={metric} />} />
              <Line
                type="monotone"
                dataKey={metric}
                stroke="var(--color-accent)"
                strokeWidth={2.5}
                connectNulls
                dot={dot}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
