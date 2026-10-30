/**
 * Fechas locales del negocio (Buenos Aires). El VPS corre en UTC: el día que
 * vale para rachas y semanas lo define la zona horaria, no el reloj del server.
 */
import { TIMEZONE } from '../../models/routines/routine.model.js';

// 'en-CA' formatea como YYYY-MM-DD.
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha local AR ('YYYY-MM-DD') de un Date, un ISO string o un timestamp. */
export const localDate = (value = new Date()) => dateFormatter.format(new Date(value));
