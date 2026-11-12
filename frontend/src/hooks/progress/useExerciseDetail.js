import { useQueries } from '@tanstack/react-query';
import { exerciseProgressOptions } from '@/hooks/progress/useProgress';
import { compareCandidates } from '@/utils/progress/compare';
import { detailRows } from '@/utils/progress/exerciseDetail';

/**
 * Detalle por ejercicio en `range` (`{ from, to }`) con la métrica `metric`: las curvas de los candidatos de la
 * comparada (`compareCandidates`), con la misma caché (`exerciseProgressOptions`), así que no suma pedidos.
 * `rows`: ver `detailRows`. `failed`: las curvas que fallaron (`{ id, name, retry }`). `hidden`: ningún ejercicio
 * tiene 3 días en todo el historial (ese vacío lo explica el panel).
 */
export function useExerciseDetail(studentId, exercises, range, metric) {
  const candidates = compareCandidates(exercises, { from: range?.from });
  const queries = useQueries({ queries: candidates.map((e) => exerciseProgressOptions(e.id, studentId, range)) });
  const curves = candidates
    .map((e, i) => queries[i].data && { ...e, points: queries[i].data.points ?? [] })
    .filter(Boolean);
  const failed = candidates
    .map((e, i) => queries[i].isError && { id: e.id, name: e.name, retry: () => queries[i].refetch() })
    .filter(Boolean);
  return {
    rows: detailRows(curves, metric),
    loading: queries.some((q) => q.isPending),
    failed,
    allFailed: candidates.length > 0 && failed.length === candidates.length,
    hidden: compareCandidates(exercises).length === 0,
  };
}
