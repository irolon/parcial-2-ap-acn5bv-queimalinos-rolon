import { errorResponse, jsonResponse, stubFetch } from '../shared/fetchMock';

const NOT_HANDLED = () => errorResponse(500, 'INTERNAL', 'Sin handler');

/**
 * Stub de la API del editor de rutinas sobre `stubFetch`.
 * - `routines`, `students` (activos), `deactivated` (dados de baja, `?active=false`), `exercises`, `templates`: respuestas de los GET.
 * - `handlers`: `{ create, update }` para POST/PATCH de `/routines`; lo que no se maneja devuelve 500.
 */
export function stubRoutinesApi({ routines = [], students = [], deactivated = [], exercises = [], templates = [], handlers = {} } = {}) {
  return stubFetch(async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const path = url.replace(/^.*\/api/, '');
    if (method === 'GET' && path.startsWith('/routines')) return jsonResponse(200, { data: routines });
    if (method === 'GET' && path.startsWith('/students')) {
      return jsonResponse(200, { data: path.includes('active=false') ? deactivated : students });
    }
    if (method === 'GET' && path.startsWith('/exercises')) return jsonResponse(200, { data: exercises });
    if (method === 'GET' && path.startsWith('/routine-templates')) return jsonResponse(200, { data: templates });
    const byMethod = { POST: handlers.create, PATCH: handlers.update };
    return (byMethod[method] ?? NOT_HANDLED)(init, url);
  });
}
