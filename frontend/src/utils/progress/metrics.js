export const METRICS = [
  { value: 'e1rm_kg', label: '1RM estimado' },
  { value: 'max_kg', label: 'Peso máximo' },
  { value: 'volume_kg', label: 'Volumen' },
  { value: 'reps', label: 'Repeticiones' },
];

/** Mínimo de puntos para dibujar una curva. */
export const MIN_POINTS = 3;

const KG_METRICS = ['e1rm_kg', 'max_kg', 'volume_kg'];

/** Hay kg cargados si algún punto tiene peso máximo mayor a 0 (los ejercicios de peso corporal no). */
export const hasKg = (points) => points.some((p) => p.max_kg > 0);

/** METRICS con las métricas de kg deshabilitadas cuando el ejercicio no tiene kg. */
export function metricOptions(points) {
  const kg = hasKg(points);
  return METRICS.map((m) => ({ ...m, disabled: !kg && KG_METRICS.includes(m.value) }));
}
