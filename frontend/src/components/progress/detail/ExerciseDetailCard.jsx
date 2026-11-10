import { useMemo, useState } from 'react';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import { useExerciseDetail } from '@/hooks/progress/useExerciseDetail';
import { useProgressOverview } from '@/hooks/progress/useProgress';
import { COMPARE_METRICS } from '@/utils/progress/compare';
import { DEFAULT_RANGE, RANGES, rangeFor } from '@/utils/progress/ranges';
import ExerciseDetailRow from './ExerciseDetailRow';

const VISIBLE = 6;
const NO_DATA = 'En este rango ningún ejercicio tiene 3 entrenamientos. Probá con un rango más largo.';

const labelOf = (list, value) => list.find((o) => o.value === value)?.label ?? '';

function FailedFooter({ failed }) {
  const n = failed.length;
  return (
    <div role="alert" className="mt-2 flex items-center justify-between gap-3 font-body text-sm text-ink6">
      <span>No pudimos cargar {n === 1 ? '1 ejercicio' : `${n} ejercicios`}.</span>
      <Button variant="ghost" size="sm" onClick={() => failed.forEach((f) => f.retry())}>
        Reintentar
      </Button>
    </div>
  );
}

function Rows({ rows }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, VISIBLE);
  return (
    <>
      <ul className="divide-y divide-ink2">
        {shown.map((row) => (
          <ExerciseDetailRow key={row.id} row={row} />
        ))}
      </ul>
      {!all && rows.length > VISIBLE && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAll(true)}>
          Ver todos ({rows.length})
        </Button>
      )}
    </>
  );
}

function Body({ detail }) {
  const { rows, failed } = detail;
  if (detail.allFailed) return <ErrorState message="No pudimos cargar el detalle." onRetry={() => failed.forEach((f) => f.retry())} />;
  if (detail.loading) return <LoadingState rows={3} label="Cargando el detalle…" />;
  return (
    <>
      {rows.length > 0 ? <Rows rows={rows} /> : <p className="font-body text-sm text-ink6">{NO_DATA}</p>}
      {failed.length > 0 && <FailedFooter failed={failed} />}
    </>
  );
}

/**
 * "Por ejercicio": valor actual, curva y % de mejora de los candidatos de la comparada en `range` (valor de `RANGES`)
 * con la métrica `metric` (de `COMPARE_METRICS`), con las curvas de la misma caché. No se muestra si ningún
 * ejercicio tiene 3 días en todo el historial.
 */
export default function ExerciseDetailCard({ studentId, range, metric, className = '' }) {
  const rangeObj = useMemo(() => rangeFor(range), [range]);
  const defaultRange = useMemo(() => rangeFor(DEFAULT_RANGE), []);
  const overview = useProgressOverview(studentId, defaultRange);
  const detail = useExerciseDetail(studentId, overview.data?.exercises ?? [], rangeObj, metric);
  if (overview.isSuccess && detail.hidden) return null;
  const extra = (
    <span className="font-mono text-[10px] tracking-[1px] text-ink6">
      {`${labelOf(COMPARE_METRICS, metric)} · ${labelOf(RANGES, range)}`.toUpperCase()}
    </span>
  );
  return (
    <Card title="Por ejercicio" extra={extra} className={`min-w-0 ${className}`}>
      {overview.isError && <ErrorState message="No pudimos cargar el detalle." onRetry={() => overview.refetch()} />}
      {overview.isPending && <LoadingState rows={3} label="Cargando el detalle…" />}
      {overview.isSuccess && <Body detail={detail} />}
    </Card>
  );
}
