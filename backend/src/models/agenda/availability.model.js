/**
 * Modelo de dominio: Disponibilidad semanal del entrenador.
 * Tabla, límites y cálculo puro de franjas libres. SIN acceso a datos.
 */
import { argentinaToUtc, utcToArgentina } from '../../shared/utils/dates/argentina.js';
import { eachDay } from '../../shared/utils/dates/ranges.js';

export const AVAILABILITY_TABLE = 'trainer_availability';

/** Máximo de franjas que se guardan en un PUT. */
export const AVAILABILITY_MAX_SLOTS = 50;
/** Máximo de días (inclusivos) de un rango de GET /availability/free. */
export const FREE_MAX_DAYS = 31;

export const AVAILABILITY_COLUMNS = 'weekday, start_time, end_time';

/** 'HH:MM[:SS]' → hora entera (las franjas son siempre en punto). */
const hourOf = (time) => Number(time.slice(0, 2));

/** Fila de la base ('08:00:00') → franja pública ('08:00'). */
export const toSlot = (row) => ({
  weekday: row.weekday,
  start_time: row.start_time.slice(0, 5),
  end_time: row.end_time.slice(0, 5),
});

/**
 * Horarios libres de 60 min (función pura).
 * - availability: filas { weekday 1–7, start_time, end_time } en hora de Argentina.
 * - taken: ISO de los turnos pending/confirmed (los cancelados no se pasan).
 * - from/to: 'YYYY-MM-DD' de Argentina, inclusivos.
 * Devuelve ISO UTC ordenados: cada hora en punto de cada franja (inicio incluido,
 * fin excluido) que sea posterior a `now` y no esté tomada.
 */
export function freeSlots({ availability, taken, from, to, now }) {
  const takenMs = new Set(taken.map((iso) => new Date(iso).getTime()));
  const nowMs = new Date(now).getTime();
  const free = new Set();
  for (const day of eachDay(from, to)) {
    const { weekday } = utcToArgentina(argentinaToUtc(day, 12));
    for (const slot of availability.filter((a) => a.weekday === weekday)) {
      for (let hour = hourOf(slot.start_time); hour < hourOf(slot.end_time); hour += 1) {
        const ms = argentinaToUtc(day, hour).getTime();
        if (ms > nowMs && !takenMs.has(ms)) free.add(ms);
      }
    }
  }
  // Set evita duplicados si dos franjas del mismo día se superponen.
  return [...free].sort((a, b) => a - b).map((ms) => new Date(ms).toISOString());
}
