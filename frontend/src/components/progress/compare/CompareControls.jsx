import { COMPARE_METRICS } from '@/utils/progress/compare';
import { RANGES } from '@/utils/progress/ranges';

const SELECT = 'h-8 rounded-md border border-ink3 bg-ink1 px-2 font-mono text-xs text-bone0 outline-none focus:border-accentText';

function CompactSelect({ label, value, options, onChange }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={SELECT}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Rango (`RANGES`) y métrica (`COMPARE_METRICS`) de la progresión comparada, en la cabecera de su tarjeta. */
export default function CompareControls({ range, onRange, metric, onMetric }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <CompactSelect label="Métrica de la comparación" value={metric} options={COMPARE_METRICS} onChange={onMetric} />
      <CompactSelect label="Rango de la comparación" value={range} options={RANGES} onChange={onRange} />
    </div>
  );
}
