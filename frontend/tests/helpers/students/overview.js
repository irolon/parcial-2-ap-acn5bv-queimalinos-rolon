import { reply } from '../shared/fetchMock';

const DAY_MS = 24 * 60 * 60 * 1000;
// Argentina es UTC-3 todo el año: corrida 3 h, la fecha UTC es la del día argentino.
const ARGENTINA_OFFSET_MS = 3 * 60 * 60 * 1000;

/** `YYYY-MM-DD` argentino de hace `n` días. */
const argentinaDay = (n, now = Date.now()) => new Date(now - ARGENTINA_OFFSET_MS - n * DAY_MS).toISOString().slice(0, 10);

/** Las 14 filas de `daily` (de hoy − 13 a hoy); `counts` son las cantidades en ese orden (por defecto, todo en 0). */
export function daily(counts = Array(14).fill(0), now = Date.now()) {
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

/** Respuesta de `GET /students/overview` (vacía: todo en 0); `overrides` pisa cualquier campo de primer nivel. */
export function overview(overrides = {}) {
  return {
    active_students: { count: 0, new_7d: 0 },
    sessions_today: { done: 0, expected: 0 },
    adherence_7d: { pct: null, delta: null },
    at_risk: 0,
    attention: [],
    recent: [],
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
