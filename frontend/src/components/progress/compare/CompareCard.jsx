import { useMemo, useState } from 'react';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import { useCompareCurves } from '@/hooks/progress/useCompareCurves';
import { useProgressOverview } from '@/hooks/progress/useProgress';
import { DEFAULT_COMPARE_METRIC } from '@/utils/progress/compare';
import { DEFAULT_RANGE, rangeFor } from '@/utils/progress/ranges';
import CompareChart from './CompareChart';
import CompareControls from './CompareControls';
import CompareSlots from './CompareSlots';

const NO_DATA = 'En este rango ningún ejercicio tiene 3 entrenamientos. Probá con un rango más largo.';
const NO_KG = 'Ningún ejercicio tiene peso registrado: no hay cargas para comparar.';

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

function Body({ compare, metric }) {
  const { lines, loading, failed, allFailed } = compare;
  if (allFailed) return <ErrorState message="No pudimos cargar la progresión." onRetry={() => failed.forEach((f) => f.retry())} />;
  if (loading) return <LoadingState rows={2} label="Cargando la progresión…" />;
  if (compare.allBodyweight) return <p className="font-body text-sm text-ink6">{NO_KG}</p>;
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
      {lines.length > 0 ? <CompareChart lines={lines} metric={metric} /> : <p className="font-body text-sm text-ink6">{NO_DATA}</p>}
    </div>
  );
}

/**
 * Progresión comparada: hasta 3 ejercicios superpuestos, los más entrenados del rango, cada uno reemplazable, con la
 * métrica elegida. Rango y métrica son propios de la tarjeta o, si llegan `range`/`onRange` y `metric`/`onMetric`,
 * de afuera (Mi progreso los comparte con el detalle). No se muestra si no hay candidatos, o si de entrada todos son
 * de peso corporal: ese vacío lo explica el panel. Una vez que se cambió el rango desde la tarjeta no se oculta más:
 * queda el select para volver, con un aviso.
 */
export default function CompareCard({ studentId, range: rangeProp, onRange, metric: metricProp, onMetric }) {
  const [ownRange, setOwnRange] = useState(DEFAULT_RANGE);
  const [ownMetric, setOwnMetric] = useState(DEFAULT_COMPARE_METRIC);
  const [touched, setTouched] = useState(false);
  const range = rangeProp ?? ownRange;
  const metric = metricProp ?? ownMetric;
  const setRange = (value) => {
    setTouched(true);
    (onRange ?? setOwnRange)(value);
  };
  const rangeObj = useMemo(() => rangeFor(range), [range]);
  // Los ejercicios del overview no dependen del rango: se usa el del rango por defecto, el mismo que pide el panel.
  const defaultRange = useMemo(() => rangeFor(DEFAULT_RANGE), []);
  const overview = useProgressOverview(studentId, defaultRange);
  const compare = useCompareCurves(studentId, overview.data?.exercises ?? [], rangeObj, metric);
  if (!overview.isSuccess || compare.hidden || (compare.allBodyweight && !touched)) return null;
  const controls = <CompareControls range={range} onRange={setRange} metric={metric} onMetric={onMetric ?? setOwnMetric} />;
  return (
    <Card title="Progresión comparada" extra={controls} className="min-w-0">
      <Body compare={compare} metric={metric} />
    </Card>
  );
}
