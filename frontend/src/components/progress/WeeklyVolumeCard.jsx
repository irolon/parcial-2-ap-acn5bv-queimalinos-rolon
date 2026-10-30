import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Card from '@/components/shared/ui/Card';
import { formatLongDate, formatShortDate, formatVolume } from '@/utils/progress/format';
import { MIN_POINTS } from '@/utils/progress/metrics';
import NotEnoughData from './NotEnoughData';
import { AXIS, GRID, TooltipBox } from './chartStyle';

function WeekTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const w = payload[0].payload;
  const sessions = `${w.sessions} ${w.sessions === 1 ? 'sesión' : 'sesiones'}`;
  return <TooltipBox title={`Semana del ${formatLongDate(w.week_start)}`} rows={[formatVolume(w.volume_kg), sessions]} />;
}

/** Volumen total por semana; las semanas sin entrenar quedan en cero. */
export default function WeeklyVolumeCard({ weeks }) {
  const trained = weeks.filter((w) => w.volume_kg > 0).length;
  return (
    <Card title="Volumen semanal">
      {trained < MIN_POINTS ? (
        <NotEnoughData count={trained} />
      ) : (
        <div role="img" aria-label="Volumen semanal" className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="week_start" tickFormatter={formatShortDate} {...AXIS} />
              <YAxis tickFormatter={formatVolume} width={56} {...AXIS} />
              <Tooltip content={<WeekTooltip />} cursor={{ fill: 'var(--color-ink3)', opacity: 0.4 }} />
              <Bar dataKey="volume_kg" fill="var(--color-cool)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
