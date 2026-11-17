// Fechas de la demo en horario de Argentina (UTC-3 todo el año, sin horario de verano).
const AR_OFFSET_HOURS = 3;
const DAY_MS = 86400000;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const toUtcDate = (dateStr) => new Date(`${dateStr}T00:00:00Z`);

/** Fecha argentina ('YYYY-MM-DD') de un instante. */
export function localDateOf(instant) {
  return new Date(instant.getTime() - AR_OFFSET_HOURS * 3600000).toISOString().slice(0, 10);
}

/** Suma (o resta) días a una fecha 'YYYY-MM-DD'. */
export function addDays(dateStr, days) {
  return new Date(toUtcDate(dateStr).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Día de la semana en el formato de `routines.days` ('monday', …). */
export function weekdayName(dateStr) {
  return WEEKDAYS[toUtcDate(dateStr).getUTCDay()];
}

/** Instante UTC (ISO) de una hora argentina en una fecha. */
export function atLocal(dateStr, hour, minute = 0) {
  const ms = toUtcDate(dateStr).getTime() + ((hour + AR_OFFSET_HOURS) * 60 + minute) * 60000;
  return new Date(ms).toISOString();
}

/** Próxima fecha que cae en `name` (hoy cuenta solo con includeToday). */
export function nextWeekday(fromDateStr, name, { includeToday = false } = {}) {
  for (let i = includeToday ? 0 : 1; i <= 7; i += 1) {
    const date = addDays(fromDateStr, i);
    if (weekdayName(date) === name) return date;
  }
  throw new Error(`día inválido: ${name}`);
}

/** Días enteros entre dos fechas 'YYYY-MM-DD' (b - a). */
export function daysBetween(a, b) {
  return Math.round((toUtcDate(b) - toUtcDate(a)) / DAY_MS);
}
