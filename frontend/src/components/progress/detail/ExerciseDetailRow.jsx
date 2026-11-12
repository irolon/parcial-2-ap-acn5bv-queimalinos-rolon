import { formatPct } from '@/utils/progress/exerciseDetail';
import { formatMetric } from '@/utils/progress/format';
import Sparkline from './Sparkline';

const pctColor = (pct) => {
  if (pct > 0) return 'text-good';
  if (pct < 0) return 'text-hot';
  return 'text-ink6';
};

const MAX_HINT = '(peso máx.)';

/**
 * Una fila del detalle: nombre, sparkline, valor actual y % de mejora del rango (ver `detailRows`). Si con 1RM cayó a
 * peso máximo lo aclara al lado del nombre, como la comparada.
 */
export default function ExerciseDetailRow({ row }) {
  const value = formatMetric(row.metric, row.current);
  const pct = formatPct(row.pct);
  const name = row.maxFallback ? `${row.name} ${MAX_HINT}` : row.name;
  const label = row.pct === null ? `${name}: ${value}` : `${name}: ${value}, ${pct} en el rango`;
  return (
    <li aria-label={label} className="flex items-center gap-3 py-2.5">
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span title={row.name} className="min-w-0 truncate font-body text-sm text-bone0">
          {row.name}
        </span>
        {row.maxFallback && <span className="shrink-0 font-mono text-[11px] text-ink6">{MAX_HINT}</span>}
      </span>
      {/* En angosto la sparkline le dejaría al nombre pocas letras: se oculta debajo de sm. */}
      <span className="hidden sm:block">
        <Sparkline values={row.values} />
      </span>
      <span className="w-20 shrink-0 text-right font-display text-sm font-semibold text-bone0">{value}</span>
      <span className={`w-14 shrink-0 text-right font-mono text-xs ${pctColor(row.pct)}`}>{pct}</span>
    </li>
  );
}
