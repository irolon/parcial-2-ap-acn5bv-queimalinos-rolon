export const pad = (n) => String(n).padStart(2, '0');

/** `aaaa-mm-dd` de `date` en la zona horaria local. */
export const todayString = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Valor para un `datetime-local` (`aaaa-mm-ddThh:mm`) en la zona horaria local. */
export const localInputValue = (date = new Date()) => `${todayString(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

// Argentina no tiene horario de verano: es UTC-3 todo el año.
const ARGENTINA_OFFSET_MS = -3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fecha de un instante (`Date`, ISO o timestamp) en Argentina, sin depender de la zona del navegador.
 * `weekday` va de 1 (lunes) a 7 (domingo) y `dayNumber` cuenta los días desde 1970: restar dos da los días que hay entre ellos.
 */
export function argentinaDate(value) {
  const wall = new Date(new Date(value).getTime() + ARGENTINA_OFFSET_MS); // sus campos UTC son la hora de pared argentina
  return {
    year: wall.getUTCFullYear(),
    month: wall.getUTCMonth() + 1,
    day: wall.getUTCDate(),
    weekday: wall.getUTCDay() || 7,
    dayNumber: Math.floor(wall.getTime() / DAY_MS),
  };
}
