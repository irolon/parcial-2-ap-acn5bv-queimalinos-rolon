import { pad } from '@/utils/dates';

export const RANGES = [
  { value: '1m', label: '1 mes' },
  { value: '3m', label: '3 meses' },
  { value: 'all', label: 'Todo' },
];

export const DEFAULT_RANGE = '3m';

const MONTHS_BACK = { '1m': 1, '3m': 3 };
const AR_OFFSET_MS = 3 * 60 * 60 * 1000; // Argentina es UTC-3 todo el año (sin horario de verano)

const toIso = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

/**
 * Rango `{ from, to }` (`YYYY-MM-DD`, fechas de Argentina) para un valor de RANGES.
 * `from` retrocede meses calendario y se corre al lunes de esa semana, porque el volumen
 * semanal del backend viene en semanas enteras; `'all'` no acota.
 */
export function rangeFor(value, now = new Date()) {
  const months = MONTHS_BACK[value];
  if (!months) return { from: null, to: null };

  const today = new Date(now.getTime() - AR_OFFSET_MS);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() - months;
  // Si el mes de destino es más corto (31 mar − 1 mes), se queda en su último día.
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const from = new Date(Date.UTC(year, month, Math.min(today.getUTCDate(), lastDay)));
  from.setUTCDate(from.getUTCDate() - ((from.getUTCDay() + 6) % 7));

  return { from: toIso(from), to: toIso(today) };
}
