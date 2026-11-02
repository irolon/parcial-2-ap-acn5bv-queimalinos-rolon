// Las horas de los mensajes se muestran siempre en Buenos Aires, sin importar la zona del dispositivo.
const ZONE = 'America/Argentina/Buenos_Aires';
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** `{ y, m, d }` del instante en Buenos Aires. */
function dayParts(date) {
  const [y, m, d] = dayFormat.format(date).split('-').map(Number);
  return { y, m, d };
}

/** Días de calendario (en Buenos Aires) entre `date` y `now`: 0 = hoy, 1 = ayer. */
function daysAgo(date, now) {
  const a = dayParts(date);
  const b = dayParts(now);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

const shortDate = (date) => {
  const { m, d } = dayParts(date);
  return `${d} ${MONTHS[m - 1]}`;
};

/** "14:05" */
export function timeLabel(iso) {
  return timeFormat.format(new Date(iso));
}

/** Separador de día: "Hoy" | "Ayer" | "12 oct". */
export function dayLabel(iso, now = new Date()) {
  const date = new Date(iso);
  const diff = daysAgo(date, now);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return shortDate(date);
}

/** Hora para la lista de conversaciones: "14:05" (hoy) | "Ayer" | "12 oct". */
export function listTimeLabel(iso, now = new Date()) {
  const date = new Date(iso);
  const diff = daysAgo(date, now);
  if (diff === 0) return timeLabel(iso);
  if (diff === 1) return 'Ayer';
  return shortDate(date);
}

/** `aaaa-mm-dd` del instante en Buenos Aires, para agrupar mensajes por día. */
export function dayKey(iso) {
  return dayFormat.format(new Date(iso));
}
