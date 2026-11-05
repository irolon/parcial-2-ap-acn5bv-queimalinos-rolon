/**
 * Etiquetas de fecha para textos de usuario (hora de Argentina).
 */
import { utcToArgentina } from './argentina.js';

const WEEKDAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

const pad = (n) => String(n).padStart(2, '0');

/** ISO UTC → 'jue 06/11 a las 18:00'. */
export function appointmentLabel(value) {
  const { date, weekday, hour, minute } = utcToArgentina(value);
  return `${WEEKDAYS[weekday - 1]} ${date.slice(8, 10)}/${date.slice(5, 7)} a las ${pad(hour)}:${pad(minute)}`;
}
