import { errorResponse, jsonResponse, stubFetch } from '../shared/fetchMock';

const NOT_HANDLED = () => errorResponse(500, 'INTERNAL', 'Sin handler');

const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO de hace `n` días (para armar alumnos con actividad relativa a hoy). */
export const daysAgo = (n) => new Date(Date.now() - n * DAY_MS).toISOString();

/**
 * Stub de la API de alumnos sobre `stubFetch`.
 * - `list`: respuesta de `GET /students` (activos); `disabled`: la de `?active=false`.
 * - `detail`: ficha de `GET /students/:id` (o función que la arma en cada GET) (`detailError`: status de error, p. ej. 403); `metrics`: respuesta de `GET /students/:id/metrics`.
 * - `handlers`: `{ update, createMetric, deleteMetric }` para el resto; lo que no se maneja devuelve 500.
 */
export function stubStudents({ list = [], disabled = [], detail, detailError, metrics = [], metricsError, handlers = {} } = {}) {
  return stubFetch(async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const path = url.replace(/^.*\/api/, '');
    if (method === 'GET' && path.startsWith('/students?')) {
      return jsonResponse(200, { data: path.includes('active=false') ? disabled : list });
    }
    if (method === 'GET' && /^\/students\/[^/]+\/metrics/.test(path)) {
      if (metricsError) return errorResponse(metricsError, 'INTERNAL');
      return jsonResponse(200, { data: typeof metrics === 'function' ? metrics() : metrics });
    }
    if (method === 'GET' && /^\/students\/[^/?]+$/.test(path) && detailError) {
      return errorResponse(detailError, detailError === 403 ? 'FORBIDDEN' : 'INTERNAL');
    }
    if (method === 'GET' && /^\/students\/[^/?]+$/.test(path) && detail) {
      return jsonResponse(200, { data: typeof detail === 'function' ? detail() : detail });
    }
    const byMethod = { PATCH: handlers.update, POST: handlers.createMetric, DELETE: handlers.deleteMetric };
    return (byMethod[method] ?? NOT_HANDLED)(init, url);
  });
}
