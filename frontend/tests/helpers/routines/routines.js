import { errorResponse, jsonResponse, stubFetch } from '../shared/fetchMock';

const NOT_HANDLED = () => errorResponse(500, 'INTERNAL', 'Sin handler');

/**
 * Stub de la API del editor de rutinas sobre `stubFetch`.
 * - `routines` (cada una con `student: { name, active }`, como el listado real), `students` (activos), `deactivated` (dados de baja, `?active=false`), `exercises`, `templates`: respuestas de los GET.
 * - `template`: respuesta de `GET /routine-templates/:id` (el listado usa `templates`).
 * - `handlers`: `{ create, update, createTemplate }` para POST/PATCH de `/routines` y POST de `/routine-templates`; lo que no se maneja devuelve 500.
 */
export function stubRoutinesApi({ routines = [], students = [], deactivated = [], exercises = [], templates = [], template, handlers = {} } = {}) {
  return stubFetch(async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const path = url.replace(/^.*\/api/, '');
    if (method === 'GET' && path.startsWith('/routines')) return jsonResponse(200, { data: routines });
    if (method === 'GET' && path.startsWith('/students')) {
      return jsonResponse(200, { data: path.includes('active=false') ? deactivated : students });
    }
    if (method === 'GET' && path.startsWith('/exercises')) return jsonResponse(200, { data: exercises });
    if (method === 'GET' && /^\/routine-templates\/[^/]+$/.test(path)) return jsonResponse(200, { data: template });
    if (method === 'GET' && path.startsWith('/routine-templates')) return jsonResponse(200, { data: templates });
    if (method === 'POST' && path.startsWith('/routine-templates')) return (handlers.createTemplate ?? NOT_HANDLED)(init, url);
    const byMethod = { POST: handlers.create, PATCH: handlers.update };
    return (byMethod[method] ?? NOT_HANDLED)(init, url);
  });
}
