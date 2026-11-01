import { pad } from '@/utils/dates';

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
const AR_OFFSET_MS = 3 * HOUR_MS; // Argentina es UTC-3 todo el año (sin horario de verano)

export const WEEKDAYS_SHORT = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
export const WEEKDAYS_TITLE = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const MONTHS_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

/** Date a partir de un Date o un ISO. */
export const toDate = (value) => (value instanceof Date ? value : new Date(value));

/** `YYYY-MM-DD` de un Date construido con `Date.UTC` (cuyos campos UTC son los de la fecha). */
export const isoDay = (utcDate) =>
  `${utcDate.getUTCFullYear()}-${pad(utcDate.getUTCMonth() + 1)}-${pad(utcDate.getUTCDate())}`;

/** Medianoche UTC del `YYYY-MM-DD` (calendario sin zona). */
export const parseDay = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/** Fecha y hora de Argentina de un instante: `{ date: 'YYYY-MM-DD', hour, minute, weekday }` (weekday 1 = lunes … 7). */
export function arParts(value) {
  const shifted = new Date(toDate(value).getTime() - AR_OFFSET_MS);
  return {
    date: isoDay(shifted),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: ((shifted.getUTCDay() + 6) % 7) + 1,
  };
}

/** ISO UTC del instante en que empieza `hour` (hora de Argentina) del día `date`. */
export const slotIso = (date, hour) => new Date(parseDay(date).getTime() + hour * HOUR_MS + AR_OFFSET_MS).toISOString();

/** Clave estable de una celda del calendario. */
export const slotKey = (date, hour) => `${date}T${pad(hour)}`;
