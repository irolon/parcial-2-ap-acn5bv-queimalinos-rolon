const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// ISO 8601 con zona obligatoria: "10:00" sin zona no dice en qué país se midió.
const ISO_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

/**
 * Formato ISO y fecha/hora reales tal como están escritas (sin mirar la zona):
 * Date.parse no sirve solo, porque acepta "02-30" y la corre al 2 de marzo.
 */
export function isRealCalendarDateTime(value) {
  const m = ISO_DATETIME_RE.exec(value);
  if (!m) return false;
  const [year, month, day, hour, minute, second] = m.slice(1).map((n) => Number(n ?? 0));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth
    && hour <= 23 && minute <= 59 && second <= 59;
}

/** String ISO 8601 con zona obligatoria y fecha/hora reales. */
// Date.parse descarta offsets imposibles como +25:00.
export const isIsoDateTime = (v) =>
  typeof v === 'string' && isRealCalendarDateTime(v) && !Number.isNaN(Date.parse(v));
