export const pad = (n) => String(n).padStart(2, '0');

/** `aaaa-mm-dd` de `date` en la zona horaria local. */
export const todayString = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Valor para un `datetime-local` (`aaaa-mm-ddThh:mm`) en la zona horaria local. */
export const localInputValue = (date = new Date()) => `${todayString(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
