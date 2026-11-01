// Cómo se muestran los números de la sesión activa (es-AR: coma decimal, sin separador de miles).

const KG = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2, useGrouping: false });

const pad = (n) => String(n).padStart(2, '0');

/** Peso de una serie como texto de campo: 62.5 → "62,5", 70 → "70"; sin peso (peso corporal), vacío. */
export const kgText = (kg) => (kg === null || kg === undefined ? '' : KG.format(kg));

/** Peso de una serie ya registrada: "62,5 kg", o "Peso corporal" si no se cargó peso. */
export const kgLabel = (kg) => (kg === null || kg === undefined ? 'Peso corporal' : `${KG.format(kg)} kg`);

/** Descanso: 90 → "1:30". Nunca negativo. */
export function formatClock(seconds) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}

/** Tiempo transcurrido de la sesión: "22:14" o, pasada la hora, "1:02:03". Nunca negativo. */
export function formatElapsed(milliseconds) {
  const total = Number.isFinite(milliseconds) ? Math.max(0, Math.floor(milliseconds / 1000)) : 0;
  const minutes = Math.floor(total / 60) % 60;
  const seconds = pad(total % 60);
  return total >= 3600 ? `${Math.floor(total / 3600)}:${pad(minutes)}:${seconds}` : `${minutes}:${seconds}`;
}
