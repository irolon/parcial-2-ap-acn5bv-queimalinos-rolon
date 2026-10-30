/**
 * Fechas locales del negocio (Buenos Aires). El VPS corre en UTC: el día que
 * vale para rachas y semanas lo define la zona horaria, no el reloj del server.
 */

/** Zona horaria del negocio (la comparten rutinas, rachas y semanas). */
export const TIMEZONE = 'America/Argentina/Buenos_Aires';

/** Milisegundos de un día. */
export const DAY_MS = 86_400_000;

// 'en-CA' formatea como YYYY-MM-DD.
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha local AR ('YYYY-MM-DD') de un Date, un ISO string o un timestamp. */
export const localDate = (value = new Date()) => dateFormatter.format(new Date(value));
