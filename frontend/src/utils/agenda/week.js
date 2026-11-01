import { pad } from '@/utils/dates';
import { DAY_MS, MONTHS_SHORT, WEEKDAYS_SHORT, arParts, isoDay, parseDay } from './time';

/**
 * Semana (lunes a domingo, hora de Argentina) que contiene a `date` (Date o ISO).
 * `now` solo sirve para marcar `isToday` (por defecto, el momento actual).
 * @returns {{ from: string, to: string, days: { date: string, weekday: number, label: string, isToday: boolean }[] }}
 */
export function weekOf(date, now = new Date()) {
  const { date: day, weekday } = arParts(date);
  const monday = parseDay(day).getTime() - (weekday - 1) * DAY_MS;
  const today = arParts(now).date;
  const days = WEEKDAYS_SHORT.map((name, i) => {
    const d = new Date(monday + i * DAY_MS);
    return { date: isoDay(d), weekday: i + 1, label: `${name} ${pad(d.getUTCDate())}`, isToday: isoDay(d) === today };
  });
  return { from: days[0].date, to: days[6].date, days };
}

/** Lunes de la semana `offset` semanas después (o antes, si es negativo) de la que empieza en `from`. */
export const shiftWeek = (from, offset) => isoDay(new Date(parseDay(from).getTime() + offset * 7 * DAY_MS));

/** `'SEMANA DEL 3 AL 9 NOV'`; si cruza de mes, `'SEMANA DEL 27 OCT AL 2 NOV'`. */
export function weekTitle(from, to) {
  const a = parseDay(from);
  const b = parseDay(to);
  const end = `${b.getUTCDate()} ${MONTHS_SHORT[b.getUTCMonth()]}`;
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  const start = sameMonth ? `${a.getUTCDate()}` : `${a.getUTCDate()} ${MONTHS_SHORT[a.getUTCMonth()]}`;
  return `SEMANA DEL ${start} AL ${end}`;
}
