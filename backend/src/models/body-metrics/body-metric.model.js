/**
 * Modelo de dominio: BodyMetric (medidas corporales del alumno).
 * Estructura + helpers puros. SIN lógica de negocio ni acceso a datos.
 *
 * El IMC (bmi) se CALCULA, nunca se guarda: un valor derivado persistido
 * termina desincronizado del peso y la altura.
 */

export const BODY_METRICS_TABLE = 'body_metrics';

export const BODY_METRIC_COLUMNS =
  'id, student_id, weight_kg, height_cm, body_fat_pct, waist_cm, hip_cm, chest_cm, recorded_at, recorded_by';

/** Campos de medida que se pueden cargar (todos opcionales, al menos uno). */
export const MEASUREMENT_FIELDS = [
  'weight_kg',
  'height_cm',
  'body_fat_pct',
  'waist_cm',
  'hip_cm',
  'chest_cm',
];

const isMissing = (v) => v === null || v === undefined;

/** IMC = peso / (altura en metros)², a 1 decimal. null si no se puede calcular. */
export function computeBmi(weightKg, heightCm) {
  if (isMissing(weightKg) || isMissing(heightCm)) return null;
  const weight = Number(weightKg);
  const heightM = Number(heightCm) / 100;
  if (!Number.isFinite(weight) || !Number.isFinite(heightM) || heightM <= 0) return null;
  return Math.round((weight / heightM ** 2) * 10) / 10;
}

/**
 * Agrega `bmi` a una fila. Si la medida no trae altura usa `fallbackHeightCm`
 * (la última altura registrada antes de esa medida): nadie se mide la altura
 * cada vez que se pesa.
 */
export function toBodyMetric(row, fallbackHeightCm = null) {
  const height = isMissing(row.height_cm) ? fallbackHeightCm : row.height_cm;
  return { ...row, bmi: computeBmi(row.weight_kg, height) };
}

/**
 * Agrega `bmi` a un historial ordenado ascendente, arrastrando la última altura.
 * Las filas del mismo instante se resuelven juntas: la altura de una vale para
 * las otras ("en o antes de", igual que findLatestHeightCm para una sola medida),
 * así el IMC no depende de en qué orden llegaron los empates.
 */
export function withBmiHistory(rowsAsc) {
  const result = [];
  let lastHeight = null;
  let start = 0;
  while (start < rowsAsc.length) {
    const instant = Date.parse(rowsAsc[start].recorded_at);
    let end = start + 1;
    while (end < rowsAsc.length && Date.parse(rowsAsc[end].recorded_at) === instant) end += 1;

    const group = rowsAsc.slice(start, end);
    for (const row of group) if (!isMissing(row.height_cm)) lastHeight = row.height_cm;
    for (const row of group) result.push(toBodyMetric(row, lastHeight));
    start = end;
  }
  return result;
}
