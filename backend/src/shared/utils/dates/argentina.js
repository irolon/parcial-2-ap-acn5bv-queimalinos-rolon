/**
 * Conversión entre hora de Argentina y UTC. Argentina es UTC-3 todo el año (sin
 * horario de verano), así que alcanza con un offset fijo; está definido acá y
 * en ningún otro lugar. Coincide con TIMEZONE de dates.js (lo verifica el test).
 */

/** Horas que Argentina está detrás de UTC. */
export const AR_UTC_OFFSET_H = 3;

const HOUR_MS = 3_600_000;

/** Date UTC del instante en que en Argentina son las `hour` (0–23) del día 'YYYY-MM-DD'. */
export function argentinaToUtc(dateStr, hour) {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Date.UTC normaliza el desborde: 22 h AR es 01 h UTC del día siguiente.
  return new Date(Date.UTC(year, month - 1, day, hour + AR_UTC_OFFSET_H));
}

/** { date: 'YYYY-MM-DD', weekday: 1 (lunes) – 7 (domingo), hour, minute } en Argentina. */
export function utcToArgentina(value) {
  const shifted = new Date(new Date(value).getTime() - AR_UTC_OFFSET_H * HOUR_MS);
  return {
    date: shifted.toISOString().slice(0, 10),
    weekday: shifted.getUTCDay() || 7,
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** Instante válido que cae justo en una hora en punto (sin minutos, segundos ni ms). */
export function isOnTheHour(value) {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) && ms % HOUR_MS === 0;
}

/** Primera hora en punto estrictamente posterior a `now` (el turno más próximo que se puede pedir). */
export function nextHourUtc(now = new Date()) {
  return new Date((Math.floor(new Date(now).getTime() / HOUR_MS) + 1) * HOUR_MS);
}
