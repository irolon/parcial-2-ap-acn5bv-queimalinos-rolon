import { useMemo, useState } from 'react';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import { useCompareCurves } from '@/hooks/progress/useCompareCurves';
import { useProgressOverview } from '@/hooks/progress/useProgress';
import { DEFAULT_RANGE, RANGES, rangeFor } from '@/utils/progress/ranges';
import CompareChart from './CompareChart';
import CompareSlots from './CompareSlots';

const NO_DATA = 'En este rango ningún ejercicio tiene 3 entrenamientos. Probá con un rango más largo.';

function RangeSelect({ value, onChange }) {
  return (
    <select
      aria-label="Rango de la comparación"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-ink3 bg-ink1 px-2 font-mono text-xs text-bone0 outline-none focus:border-accentText"
    >
      {RANGES.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

function FailedCurve({ name, retry }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 font-body text-sm text-ink6">
      <span>No pudimos cargar {name}.</span>
      <Button variant="ghost" size="sm" onClick={retry}>
        Reintentar
      </Button>
    </div>
  );
}

function Body({ compare }) {
  const { lines, loading, failed, allFailed } = compare;
  if (allFailed) return <ErrorState message="No pudimos cargar la progresión." onRetry={() => failed.forEach((f) => f.retry())} />;
  if (loading) return <LoadingState rows={2} label="Cargando la progresión…" />;
  const mixed = lines.some((l) => l.metric === 'e1rm_kg') && lines.some((l) => l.metric === 'max_kg');
  const maxOnly = new Set(mixed ? lines.filter((l) => l.metric === 'max_kg').map((l) => l.id) : []);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <CompareSlots
        slots={compare.slots}
        options={compare.options}
        bodyweight={compare.bodyweight}
        few={compare.few}
        maxOnly={maxOnly}
        loading={compare.slotLoading}
        onChange={compare.setSlot}
      />
      {failed.map((f) => (
        <FailedCurve key={f.id} name={f.name} retry={f.retry} />
      ))}
      {lines.length > 0 ? <CompareChart lines={lines} /> : <p className="font-body text-sm text-ink6">{NO_DATA}</p>}
    </div>
  );
}

/**
 * Progresión comparada: hasta 3 ejercicios superpuestos, los más entrenados del rango (propio de la tarjeta),
 * cada uno reemplazable. No se muestra si no hay candidatos o todos son de peso corporal: ese vacío lo explica el panel.
 */
export default function CompareCard({ studentId }) {
  const [range, setRange] = useState(DEFAULT_RANGE);
  const rangeObj = useMemo(() => rangeFor(range), [range]);
  // Los ejercicios del overview no dependen del rango: se usa el del rango por defecto, el mismo que pide el panel.
  const defaultRange = useMemo(() => rangeFor(DEFAULT_RANGE), []);
  const overview = useProgressOverview(studentId, defaultRange);
  const compare = useCompareCurves(studentId, overview.data?.exercises ?? [], rangeObj);
  if (!overview.isSuccess || compare.hidden) return null;
  return (
    <Card title="Progresión comparada" extra={<RangeSelect value={range} onChange={setRange} />} className="min-w-0">
      <Body compare={compare} />
    </Card>
  );
}
