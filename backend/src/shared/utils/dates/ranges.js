/**
 * Rangos de días calendario argentinos ('YYYY-MM-DD', inclusivos).
 */
import { argentinaToUtc } from './argentina.js';
import { DAY_MS } from './dates.js';

/**
 * Límites UTC del rango: `fromUtc` es el inicio de `from` y `toUtc` el fin de `to`,
 * o sea el 00:00 AR del día siguiente (cota EXCLUSIVA: filtrar con `< toUtc`).
 */
export function argDayRange(from, to) {
  return { fromUtc: argentinaToUtc(from, 0), toUtc: argentinaToUtc(to, 24) };
}

/** Todos los días de `from` a `to`, ambos incluidos ([] si `to` es anterior a `from`). */
export function eachDay(from, to) {
  const days = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += DAY_MS) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}
