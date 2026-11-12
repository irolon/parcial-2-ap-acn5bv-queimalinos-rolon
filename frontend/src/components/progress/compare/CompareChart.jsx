import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { mergeSeries, timeTicks } from '@/utils/progress/compare';
import { formatLongDate, formatMetric, formatShortDate, timeToDate } from '@/utils/progress/format';
import { AXIS, GRID, TooltipBox } from '../chartStyle';
import SlotMark, { SlotDot } from './SlotMark';

/** `A`, `A y B`, `A, B y C`. */
const joinNames = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`);

export function CompareTooltip({ active, payload, lines }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const rows = lines.filter((l) => row[l.id] !== null && row[l.id] !== undefined).map((l) => `${l.name}: ${formatMetric(l.metric, row[l.id])}`);
  return <TooltipBox title={formatLongDate(row.date)} rows={rows} />;
}

function Legend({ lines }) {
  return (
    <ul className="mb-2 flex flex-wrap justify-end gap-x-4 gap-y-1 font-mono text-[11px] text-bone2">
      {lines.map((l) => (
        <li key={l.id} className="flex items-center gap-1.5">
          <SlotMark color={l.color} dash={l.dash} shape={l.shape} />
          {l.name}
        </li>
      ))}
    </ul>
  );
}

const NOTES = { max_kg: 'Peso máximo · kg', volume_kg: 'Volumen · kg' };

/**
 * Con peso máximo o volumen, esa; con 1RM estimado (por defecto), `1RM estimado · kg`, `Peso máximo · kg` si todas van
 * con peso máximo, o la excepción entre paréntesis.
 */
function metricNote(lines, metric) {
  if (NOTES[metric]) return NOTES[metric];
  const maxNames = lines.filter((l) => l.metric === 'max_kg').map((l) => l.name);
  if (maxNames.length === lines.length) return 'Peso máximo · kg';
  return maxNames.length ? `1RM estimado · kg (${joinNames(maxNames)}: peso máximo)` : '1RM estimado · kg';
}

/**
 * Hasta 3 ejercicios superpuestos (`lines`: `{ id, name, color, dash, shape, metric, points }`), con el eje X de
 * tiempo real y pocas marcas parejas (`timeTicks`) para que las fechas no se encimen.
 * Cada línea usa su métrica (`metric` de la línea): con 1RM estimado, si el ejercicio no tiene ninguno, el peso máximo.
 */
export default function CompareChart({ lines, metric = 'e1rm_kg' }) {
  const rows = mergeSeries(lines, (l) => l.metric);
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
              ticks={timeTicks(rows)}
              interval="preserveStartEnd"
              minTickGap={28}
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
                strokeDasharray={l.dash || undefined}
                connectNulls
                dot={(p) => <SlotDot key={p.key} cx={p.cx} cy={p.cy} shape={l.shape} color={l.color} />}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[1px] text-ink6">
        {metricNote(lines, metric)}
      </p>
    </div>
  );
}
