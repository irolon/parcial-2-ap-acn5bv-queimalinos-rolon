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

const hasValue = (points, key) => points.some((p) => p[key] !== null && p[key] !== undefined);

/**
 * METRICS con `disabled` y el motivo (`reason`): se deshabilita toda métrica sin ningún valor
 * no nulo en los puntos, y las de kg cuando no hay peso registrado.
 */
export function metricOptions(points) {
  const kg = hasKg(points);
  return METRICS.map((m) => {
    const noKg = KG_METRICS.includes(m.value) && !kg;
    const disabled = noKg || !hasValue(points, m.value);
    return { ...m, disabled, reason: noKg ? 'Sin peso registrado' : 'Sin datos en este rango' };
  });
}

const countValues = (points, key) => points.filter((p) => p[key] !== null && p[key] !== undefined).length;

/**
 * Métrica a mostrar. Prefiere una con al menos MIN_POINTS valores (alcanza para dibujar la curva):
 * la pedida, si no la por defecto, si no la primera habilitada. Si ninguna llega, vale la pedida
 * si está habilitada; si no, la por defecto o la primera habilitada, y si no hay, la por defecto.
 */
export function resolveMetric(points, wanted, fallback) {
  const enabled = metricOptions(points).filter((o) => !o.disabled);
  const drawable = enabled.filter((o) => countValues(points, o.value) >= MIN_POINTS);
  if (drawable.some((o) => o.value === wanted)) return wanted;
  if (drawable.length > 0) return drawable[0].value;
  if (enabled.some((o) => o.value === wanted)) return wanted;
  if (enabled.some((o) => o.value === fallback)) return fallback;
  return enabled[0]?.value ?? fallback;
}

/** Con "Todo" el récord es el histórico; con un rango acotado, el mejor de ese rango. */
export const recordLabel = (range) => (range === 'all' ? 'Récord' : 'Mejor del rango');

/** Récord de la métrica de kg elegida (e1rm_kg/max_kg); null para volumen y reps. */
export const recordFor = (pr, metric) => (metric === 'e1rm_kg' || metric === 'max_kg' ? pr?.[metric] ?? null : null);
