import { STREAK } from '../achievements/gamification';
import { sessionsPage } from '../sessions/sessions';
import { errorResponse, jsonResponse, stubFetch } from '../shared/fetchMock';

/** Respuesta de `GET /students/:id/attendance` (sin `days`, que la web no usa). */
export const ATTENDANCE = { month: '2026-11', sessions: 6, assigned_days: 9, has_plan: true, prs: 2, days: [] };

const ATTENDANCE_PATH = /^\/students\/[^/]+\/attendance(\?|$)/;

/**
 * La respuesta de `/students/:id/attendance`, o `null` si el path es otro. `data` es el dato (200),
 * un status de error o una función que devuelve alguno de los dos (o la Response) en cada pedido.
 */
export function attendanceResponse(path, data = ATTENDANCE) {
  return ATTENDANCE_PATH.test(path) ? answer(data) : null;
}

function answer(value) {
  const data = typeof value === 'function' ? value() : value;
  if (data instanceof Response) return data;
  return typeof data === 'number' ? errorResponse(data, 'INTERNAL') : jsonResponse(200, { data });
}

/**
 * Stub de `fetch` para los indicadores de compromiso: asistencia, racha, overview y primera página del historial.
 * Cada valor es como el de `attendanceResponse` (`sessions`, la página entera o un status); lo demás da 500.
 */
export function stubCommitment({ attendance = ATTENDANCE, streak = STREAK, overview, sessions = sessionsPage([]) } = {}) {
  return stubFetch(async (url) => {
    const path = url.replace(/^.*\/api/, '');
    const attended = attendanceResponse(path, attendance);
    if (attended) return attended;
    if (/^\/students\/[^/]+\/streak$/.test(path)) return answer(streak);
    if (path.startsWith('/progress/overview')) return answer(overview ?? { exercises: [], weekly_volume: [] });
    if (/^\/students\/[^/]+\/sessions\?/.test(path)) {
      return typeof sessions === 'number' ? errorResponse(sessions, 'INTERNAL') : jsonResponse(200, sessions);
    }
    return errorResponse(500, 'INTERNAL', 'Sin handler');
  });
}
