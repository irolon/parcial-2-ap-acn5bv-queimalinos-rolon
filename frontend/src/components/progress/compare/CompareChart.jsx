import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { mergeSeries } from '@/utils/progress/compare';
import { formatKg, formatLongDate, formatShortDate, timeToDate } from '@/utils/progress/format';
import { AXIS, GRID, TooltipBox } from '../chartStyle';

/** `A`, `A y B`, `A, B y C`. */
const joinNames = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`);

export function CompareTooltip({ active, payload, lines }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const rows = lines.filter((l) => row[l.id] !== null && row[l.id] !== undefined).map((l) => `${l.name}: ${formatKg(row[l.id])}`);
  return <TooltipBox title={formatLongDate(row.date)} rows={rows} />;
}

function Legend({ lines }) {
  return (
    <ul className="mb-2 flex flex-wrap justify-end gap-x-4 gap-y-1 font-mono text-[11px] text-bone2">
      {lines.map((l) => (
        <li key={l.id} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-0.5 w-3.5 rounded" style={{ background: l.color }} />
          {l.name}
        </li>
      ))}
    </ul>
  );
}

/**
 * Hasta 3 ejercicios superpuestos (`lines`: `{ id, name, color, metric, points }`), con el eje X de tiempo real.
 * Cada línea usa su métrica: el 1RM estimado o, si el ejercicio no tiene ninguno, el peso máximo.
 */
export default function CompareChart({ lines }) {
  const rows = mergeSeries(lines, (l) => l.metric);
  const allMax = lines.every((l) => l.metric === 'max_kg');
  return (
    <div>
      <Legend lines={lines} />
      <div role="img" aria-label={`Progresión comparada de ${joinNames(lines.map((l) => l.name))}`} className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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
            <Tooltip content={<CompareTooltip lines={lines} />} />
            {lines.map((l) => (
              <Line
                key={l.id}
                type="monotone"
                dataKey={l.id}
                name={l.name}
                stroke={l.color}
                strokeWidth={2.5}
                connectNulls
                dot={{ r: 3.5, fill: l.color, stroke: 'var(--color-ink1)', strokeWidth: 1.5 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[1px] text-ink6">
        {allMax ? 'PESO MÁXIMO · KG' : '1RM ESTIMADO · KG'}
      </p>
    </div>
  );
}
