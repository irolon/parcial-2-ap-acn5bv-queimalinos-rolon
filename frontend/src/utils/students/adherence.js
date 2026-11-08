/** Umbrales del celular (`adherenceColor` en StudentRow.kt): ≥ 70 % verde, ≥ 50 % azul, coral por debajo. */
export const ADHERENCE_GOOD = 70;
export const ADHERENCE_OK = 50;

/** Tono de la barra para un porcentaje: `'good' | 'accent' | 'hot'`. */
export function adherenceTone(pct) {
  if (pct >= ADHERENCE_GOOD) return 'good';
  if (pct >= ADHERENCE_OK) return 'accent';
  return 'hot';
}

/** Porcentaje de los últimos 7 días; `null` sin plan (o si el backend no manda `adherence_7d`). */
export const adherencePct = (student) => student?.adherence_7d?.pct ?? null;

/**
 * Texto en lugar de la barra cuando no hay porcentaje: "Sin días todavía" si tiene rutina pero ninguno de sus días
 * pasó todavía (recién asignada); "Sin plan" si no tiene días asignados.
 */
export const noAdherenceText = (student) => (student?.days_per_week > 0 ? 'Sin días todavía' : 'Sin plan');

/** Tooltip "2 de 3 días asignados…"; `undefined` sin plan. */
export function adherenceTitle(student) {
  if (adherencePct(student) === null) return undefined;
  const { assigned, done } = student.adherence_7d;
  return `${done} de ${assigned} días asignados entrenados en los últimos 7 días`;
}
