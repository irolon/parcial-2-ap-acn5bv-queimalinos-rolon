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

/**
 * Momento en que "corre" la demo: el real, o con `--date YYYY-MM-DD` las 8 de la mañana (Argentina) de ese día.
 * Sirve para cargarla la noche anterior: el historial llega hasta el día previo a la fecha pedida.
 */
export function demoNow(argv, realNow = new Date()) {
  const i = argv.indexOf('--date');
  if (i === -1) return realNow;
  const value = argv[i + 1];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '') || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error('--date espera una fecha YYYY-MM-DD (por ejemplo --date 2026-11-18)');
  }
  return new Date(atLocal(value, 8));
}

/** Días enteros entre dos fechas 'YYYY-MM-DD' (b - a). */
export function daysBetween(a, b) {
  return Math.round((toUtcDate(b) - toUtcDate(a)) / DAY_MS);
}
