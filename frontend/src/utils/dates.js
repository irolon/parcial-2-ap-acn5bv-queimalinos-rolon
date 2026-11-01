export const pad = (n) => String(n).padStart(2, '0');

/** `aaaa-mm-dd` de `date` en la zona horaria local. */
export const todayString = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Valor para un `datetime-local` (`aaaa-mm-ddThh:mm`) en la zona horaria local. */
export const localInputValue = (date = new Date()) => `${todayString(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const AR_ZONE = 'America/Argentina/Buenos_Aires';
const arParts = (options) => new Intl.DateTimeFormat('es-AR', { timeZone: AR_ZONE, ...options });
const FULL_DATE = arParts({ day: '2-digit', month: '2-digit', year: 'numeric' });
const DAY_MONTH = arParts({ day: '2-digit', month: '2-digit' });

/** `dd/mm/aaaa` de un ISO, en hora de Argentina. */
export const formatDateAR = (iso) => FULL_DATE.format(new Date(iso));

/** `dd/mm` de un ISO, en hora de Argentina. */
export const formatDayMonthAR = (iso) => DAY_MONTH.format(new Date(iso));
