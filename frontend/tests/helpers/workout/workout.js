import { vi } from 'vitest';
import { ApiError } from '@/api/shared/client';
import { registerSet, setCursor, startWorkout } from '@/utils/workout/workoutState';
import { todayRoutine } from '../routines/studentRoutines';

/** Inicio de las sesiones de los tests: domingo 1/11, 10:00 en Argentina. */
export const T0 = new Date('2026-11-01T13:00:00.000Z');
export const at = (seconds) => new Date(T0.getTime() + seconds * 1000);
export const isoAt = (seconds) => at(seconds).toISOString();

/** Ids predecibles: `${prefix}-1`, `${prefix}-2`… */
export function sequentialIds(prefix) {
  let n = 0;
  return () => `${prefix}-${(n += 1)}`;
}

/** Sesión recién empezada con la rutina de /today: Press banca (4 × 10, 90 s, 62,5 kg) y Remo con barra (3 × 12, 60 s). */
export const freshWorkout = (routine = todayRoutine()) =>
  startWorkout(routine, { now: T0, newId: () => 'session-1' });

/** Registra series en orden, una por minuto desde T0. Cada fila es `[ejercicio, kg, reps]`; ids set-1, set-2… */
export function withSets(state, rows) {
  const newId = sequentialIds('set');
  return rows.reduce(
    (current, [cursor, kg, reps], i) => registerSet(setCursor(current, cursor), { kg, reps }, at(60 * (i + 1)), { newId }),
    state,
  );
}

/** Sesión terminada con `count` series de Press banca listas para subir (set-001, set-002…, una por segundo). */
export function finishedWorkout(count, overrides = {}) {
  const sets = Array.from({ length: count }, (_, i) => ({
    id: `set-${String(i + 1).padStart(3, '0')}`,
    exerciseId: 'e-1',
    routineExerciseId: 're-1',
    setNumber: (i % 100) + 1,
    reps: 10,
    kg: 60,
    executedAt: isoAt(i + 1),
  }));
  return { ...freshWorkout(), sets, finishedAt: isoAt(3600), ...overrides };
}

/** Ids `set-001`… de las series `from` a `to` (incluidas). */
export const setIds = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, i) => `set-${String(from + i).padStart(3, '0')}`);

export const httpError = (status, code = 'HTTP_ERROR') => new ApiError({ status, code, message: code });
export const networkError = () =>
  new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'No hay conexión con el servidor' });

/** Respuesta de un lote con todas las series guardadas (más lo que venga en `extra`). */
export const savedAll = (sets, extra = {}) => ({
  saved: sets.map(({ id }) => ({ id, created: true })),
  failed: [],
  unlocked_achievements: [],
  ...extra,
});

/**
 * API de sesiones falsa para `uploadWorkout`. `session` y `sets` son colas de respuestas, una por pedido: un valor
 * (o una función que lo arma con los argumentos del pedido) se devuelve y un Error se tira. Con la cola vacía
 * contesta como el backend cuando sale todo bien.
 */
export function fakeApi({ session = [], sets = [] } = {}) {
  const sessionQueue = [...session];
  const setsQueue = [...sets];
  const answer = async (queue, fallback, args) => {
    const next = queue.length > 0 ? queue.shift() : fallback;
    const value = typeof next === 'function' ? next(...args) : next;
    if (value instanceof Error) throw value;
    return value;
  };
  return {
    createSession: vi.fn((...args) => answer(sessionQueue, (body) => ({ ...body, unlocked_achievements: [] }), args)),
    uploadSets: vi.fn((...args) => answer(setsQueue, (_id, list) => savedAll(list), args)),
  };
}

/** Ids de las series de cada lote que se mandó, en orden (también los que fallaron). */
export const sentBatches = (api) => api.uploadSets.mock.calls.map(([, list]) => list.map((set) => set.id));
