import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { exerciseProgressOptions } from '@/hooks/progress/useProgress';
import { MAX_CANDIDATES, SLOT_STYLES, compareCandidates, compareMetric, isBodyweight, pickTop } from '@/utils/progress/compare';
import { hasKg } from '@/utils/progress/metrics';

/**
 * Curvas de la progresión comparada en `range` (`{ from, to }`): pide la de los candidatos (los de más días) y la
 * de los elegidos a mano, en paralelo y con la misma caché que la curva del panel. Las 3 líneas salen solas
 * (`pickTop`) hasta que se cambia una; al cambiar el rango vuelven a salir solas. Cada línea lleva el estilo de
 * su lugar (`SLOT_STYLES`); `slotLoading[i]`: la curva del lugar `i` todavía se está pidiendo.
 */
export function useCompareCurves(studentId, exercises, range) {
  const rangeKey = `${range?.from ?? ''}|${range?.to ?? ''}`;
  const [choice, setChoice] = useState({ rangeKey, slots: null });
  const chosen = choice.rangeKey === rangeKey ? choice.slots : null;

  const options = compareCandidates(exercises, Infinity);
  const candidates = options.slice(0, MAX_CANDIDATES);
  const requested = [...new Set([...candidates.map((e) => e.id), ...(chosen ?? []).filter(Boolean)])];
  const queries = useQueries({ queries: requested.map((id) => exerciseProgressOptions(id, studentId, range)) });

  const entries = requested.map((id, i) => ({ exercise: options.find((e) => e.id === id), query: queries[i] }));
  const curves = new Map(
    entries
      .filter(({ exercise, query }) => exercise && query.data)
      .map(({ exercise, query }) => {
        const points = query.data.points ?? [];
        return [exercise.id, { ...exercise, points, metric: compareMetric(points) }];
      }),
  );
  const loading = entries.slice(0, candidates.length).some(({ query }) => query.isPending);
  const pending = (id) => Boolean(id) && entries.some(({ exercise, query }) => exercise?.id === id && query.isPending);
  const failed = entries
    .filter(({ exercise, query }) => exercise && query.isError)
    .map(({ exercise, query }) => ({ id: exercise.id, name: exercise.name, retry: () => query.refetch() }));
  const bodyweight = new Set([...curves.values()].filter((c) => isBodyweight(c.points)).map((c) => c.id));

  const auto = pickTop(candidates.map((e) => curves.get(e.id)).filter(Boolean)).map((c) => c.id);
  const slots = chosen ?? SLOT_STYLES.map((_, i) => auto[i] ?? null);
  const setSlot = (index, id) => setChoice({ rangeKey, slots: slots.map((s, i) => (i === index ? id || null : s)) });

  // Una línea elegida a mano que todavía no llegó: solo su selector muestra que carga, no toda la tarjeta.
  const slotLoading = slots.map(pending);

  const lines = slots
    .map((id, i) => ({ curve: curves.get(id), style: SLOT_STYLES[i] }))
    .filter(({ curve }) => curve && hasKg(curve.points))
    .map(({ curve, style }) => ({ ...curve, ...style }));

  const allFailed = requested.length > 0 && entries.every(({ query }) => query.isError);
  const allBodyweight = !loading && failed.length === 0 && candidates.every((e) => bodyweight.has(e.id));
  return {
    options,
    slots,
    setSlot,
    lines,
    loading,
    slotLoading,
    failed,
    allFailed,
    bodyweight,
    hidden: candidates.length === 0 || allBodyweight,
  };
}
