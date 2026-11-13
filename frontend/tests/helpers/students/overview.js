import { DAY_MS, arParts } from '@/utils/agenda/time';
import { reply } from '../shared/fetchMock';

/** `YYYY-MM-DD` argentino de hace `n` días. */
const argentinaDay = (n, now = Date.now()) => arParts(now - n * DAY_MS).date;

/** Las 30 filas de `daily` (de hoy − 29 a hoy); `counts` son las cantidades en ese orden (por defecto, todo en 0). */
export function daily(counts = Array(30).fill(0), now = Date.now()) {
  return counts.map((count, i) => ({ date: argentinaDay(counts.length - 1 - i, now), count }));
}

/** Fila de `recent`; `overrides` pisa cualquier campo. */
export function recentSession(overrides = {}) {
  return {
    student_id: 'st-1',
    name: 'Tomás Rivera',
    session_id: 'se-1',
    routine_name: 'Push día 3',
    rpe: 8,
    finished_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Fila de `in_session` (sesión abierta, GX4); `overrides` pisa cualquier campo. */
export function inSessionRow(overrides = {}) {
  return {
    student_id: 'st-1',
    name: 'Lucía Gómez',
    session_id: 'open-1',
    routine_name: 'Pierna',
    started_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Fila de `lists.feedback_pending`; `overrides` pisa cualquier campo. */
export function feedbackRow(overrides = {}) {
  return { ...recentSession(), ...overrides };
}

/** Respuesta de `GET /students/overview` (vacía: todo en 0); `overrides` pisa cualquier campo de primer nivel. */
export function overview(overrides = {}) {
  return {
    active_students: { count: 0, new_7d: 0 },
    sessions_today: { done: 0, expected: 0 },
    adherence_7d: { pct: null, delta: null },
    at_risk: 0,
    attention: [],
    recent: [],
    in_session: [],
    lists: { today: [], at_risk: [], feedback_pending: [], students: [] },
    daily: daily(),
    ...overrides,
  };
}

/**
 * Handler de `GET /students/overview` para un stub de `fetch`: `answer` es el dato, un status de error o una función
 * (ver `reply`). Devuelve `null` si el pedido no es del overview.
 */
export const overviewRoute = (answer = overview()) => (method, path) =>
  method === 'GET' && path === '/students/overview' ? reply(answer) : null;
