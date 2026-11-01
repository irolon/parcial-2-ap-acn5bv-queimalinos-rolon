import { errorResponse, jsonResponse, stubFetch } from '../shared/fetchMock';
import { sessionsRoute } from '../sessions/sessions';

/** Respuesta de GET /students/:id/streak con `days` de racha actual (y `longest` de récord). */
export const streakData = (days = 0, longest = days) => ({
  current_streak_days: days,
  longest_streak_days: longest,
  last_session_date: days > 0 ? '2026-10-31' : null,
});

// Cada respuesta es el dato, un status de error o una función (también async) que lo arma en cada GET.
async function reply(answer) {
  const value = await (typeof answer === 'function' ? answer() : answer);
  return typeof value === 'number' ? errorResponse(value, 'INTERNAL') : jsonResponse(200, { data: value });
}

/**
 * Lo que la web del alumno pide al abrir Hoy: `(method, path, init, url) => Response | null` (null si el pedido es de otra cosa).
 * - `today`: la rutina del día o `null` (descanso o sin rutina).
 * - `mine`: las rutinas activas.
 * - `sessions`: el historial, ver `sessionsRoute` (por defecto, vacío).
 * - `streak`: la racha, ver `streakData` (por defecto, sin racha).
 * Cada uno también puede ser un status de error o una función; una que no resuelve deja la carga a medias.
 */
export function studentHomeRoute({ today = null, mine = [], sessions, streak = streakData(0) } = {}) {
  const sessionsHandler = sessionsRoute({ sessions });
  return async (method, path, init, url) => {
    if (method !== 'GET') return null;
    if (path === '/routines/today') return reply(today);
    if (path === '/routines/mine') return reply(mine);
    if (/^\/students\/[^/]+\/streak$/.test(path)) return reply(streak);
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
