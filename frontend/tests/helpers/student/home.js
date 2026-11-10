import { errorResponse, jsonResponse, reply, stubFetch } from '../shared/fetchMock';
import { sessionsRoute } from '../sessions/sessions';

/** Respuesta de GET /students/:id/streak con `days` de racha actual (y `longest` de récord). */
export const streakData = (days = 0, longest = days) => ({
  current_streak_days: days,
  longest_streak_days: longest,
  last_session_date: days > 0 ? '2026-10-31' : null,
});

/** El entrenador/a del alumno por defecto (el `counterpart` de GET /messages/:studentId). */
export const TRAINER = { id: 't-1', name: 'Laura Gómez', avatar_url: null };

// GET /messages/:studentId?limit=1 → `{ data, meta, counterpart }` (sin `data` envolvente, como el backend).
async function counterpartReply(answer) {
  const value = await (typeof answer === 'function' ? answer() : answer);
  if (typeof value === 'number') return errorResponse(value, 'INTERNAL');
  return jsonResponse(200, { data: [], meta: { next_before: null }, counterpart: value });
}

/**
 * Lo que la web del alumno pide al abrir Hoy: `(method, path, init, url) => Response | null` (null si el pedido es de otra cosa).
 * - `today`: la rutina del día o `null` (descanso o sin rutina).
 * - `mine`: las rutinas activas.
 * - `sessions`: el historial, ver `sessionsRoute` (por defecto, vacío).
 * - `streak`: la racha, ver `streakData` (por defecto, sin racha).
 * - `appointments`: los turnos de los próximos 14 días (por defecto, ninguno).
 * - `counterpart`: el entrenador/a, ver `TRAINER` (por defecto, ese).
 * Cada uno también puede ser un status de error o una función; una que no resuelve deja la carga a medias.
 */
export function studentHomeRoute({
  today = null,
  mine = [],
  sessions,
  streak = streakData(0),
  appointments = [],
  counterpart = TRAINER,
} = {}) {
  const sessionsHandler = sessionsRoute({ sessions });
  return async (method, path, init, url) => {
    if (method !== 'GET') return null;
    if (path === '/routines/today') return reply(today);
    if (path === '/routines/mine') return reply(mine);
    if (/^\/students\/[^/]+\/streak$/.test(path)) return reply(streak);
    if (/^\/appointments\?/.test(path)) return reply(appointments);
    if (/^\/messages\/[^/?]+\?limit=1$/.test(path)) return counterpartReply(counterpart);
    return sessionsHandler(method, path, init, url);
  };
}

/**
 * Stub de fetch con lo de Hoy. Lo demás lo contesta `otherwise(url, init)` (por ejemplo el login o la invitación de
 * un test que termina en Hoy); sin él, devuelve 500.
 */
export function stubStudentHome(options, otherwise = () => errorResponse(500, 'INTERNAL', 'Sin handler')) {
  const route = studentHomeRoute(options);
  return stubFetch(async (url, init = {}) => {
    const response = await route(init.method ?? 'GET', url.replace(/^.*\/api/, ''), init, url);
    return response ?? otherwise(url, init);
  });
}
