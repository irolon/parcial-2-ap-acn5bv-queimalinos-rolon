import { formatPct } from '@/utils/progress/exerciseDetail';
import { formatMetric } from '@/utils/progress/format';
import Sparkline from './Sparkline';

const pctColor = (pct) => {
  if (pct > 0) return 'text-good';
  if (pct < 0) return 'text-hot';
  return 'text-ink6';
};

/** Una fila del detalle: nombre, sparkline, valor actual y % de mejora del rango (ver `detailRows`). */
export default function ExerciseDetailRow({ row }) {
  const value = formatMetric(row.metric, row.current);
  const pct = formatPct(row.pct);
  const label = row.pct === null ? `${row.name}: ${value}` : `${row.name}: ${value}, ${pct} en el rango`;
  return (
    <li aria-label={label} className="flex items-center gap-3 py-2.5">
      <span title={row.name} className="min-w-0 flex-1 truncate font-body text-sm text-bone0">
        {row.name}
      </span>
      <Sparkline values={row.values} />
      <span className="w-20 shrink-0 text-right font-display text-sm font-semibold text-bone0">{value}</span>
      <span className={`w-14 shrink-0 text-right font-mono text-xs ${pctColor(row.pct)}`}>{pct}</span>
    </li>
  );
}
