import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS, GRID, TooltipBox } from '@/components/progress/chartStyle';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import { dayInitial, dayTitle, lastDays } from '@/utils/students/overviewFormat';

const PERIODS = [7, 14];

function DayTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, count } = payload[0].payload;
  return <TooltipBox title={dayTitle(date)} rows={[`${count} ${count === 1 ? 'sesión' : 'sesiones'}`]} />;
}

function PeriodToggle({ days, onChange }) {
  return (
    <div className="flex gap-1 rounded-lg bg-ink2 p-[3px]">
      {PERIODS.map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={days === n}
          onClick={() => onChange(n)}
          className={`rounded-md px-2.5 py-1 font-mono text-[11px] ${
            days === n ? 'bg-ink4 text-bone0' : 'text-ink6 hover:text-bone0'
          }`}
        >
          {n}D
        </button>
      ))}
    </div>
  );
}

function Bars({ rows, days }) {
  return (
    <div role="img" aria-label={`Sesiones terminadas por día, últimos ${days} días`} className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="date" tickFormatter={dayInitial} interval={0} {...AXIS} />
          <YAxis allowDecimals={false} width={28} {...AXIS} />
          <Tooltip content={<DayTooltip />} cursor={{ fill: 'var(--color-ink3)', opacity: 0.4 }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {rows.map((row, i) => (
              <Cell key={row.date} fill={i === rows.length - 1 ? 'var(--color-accent)' : 'var(--color-ink4)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Sesiones terminadas por día (la última barra es hoy), con selector de 7 o 14 días. Sin `daily`, cargando. */
export default function ActivityChart({ daily }) {
  const [days, setDays] = useState(7);
  const rows = lastDays(daily, days);
  let body;
  if (!daily) body = <LoadingState rows={2} label="Cargando el resumen…" />;
  else if (rows.every((row) => row.count === 0)) {
    body = <p className="font-body text-sm text-ink6">Ninguna sesión terminada en los últimos {days} días</p>;
  } else body = <Bars rows={rows} days={days} />;
  return (
    <Card title={`Actividad · ${days} días`} extra={<PeriodToggle days={days} onChange={setDays} />}>
      {body}
    </Card>
  );
}
