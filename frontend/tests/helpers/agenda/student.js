import { bodyOf, errorResponse, jsonResponse, reply, stubFetch } from '../shared/fetchMock';
import { renderRoute } from '../routes/renderRoute';
import { NOW, appt } from './fixtures';

export { NOW, appt };

/** Libre del viernes 06/11 a las 18:00 (21:00 UTC) y del lunes 09/11 a las 09:00. */
export const FRIDAY_18 = '2026-11-06T21:00:00.000Z';
export const MONDAY_09 = '2026-11-09T12:00:00.000Z';
export const FREE = [{ starts_at: FRIDAY_18 }, { starts_at: MONDAY_09 }];

/** Respuesta de error con el formato del backend. */
export const apiError = (status, code, message) => errorResponse(status, code, message);

/**
 * Stub de fetch para Mis turnos. La lista de turnos es "viva": el POST por defecto agrega un pendiente y el PATCH por
 * defecto lo pasa a `cancelled`, así la siguiente lectura los trae.
 * - `appointments`: la lista inicial, un status de error o una función (ver `reply`).
 * - `free`: los libres (`[{ starts_at }]`), un status o una función.
 * - `create(body)` / `cancel(id, body)`: devuelven un `Response` (por ejemplo `apiError`) para pisar lo de defecto;
 *   `undefined` sigue con lo de defecto. Pueden tirar para simular que no hay red.
 */
export function stubStudentAgenda({ appointments = [], free = FREE, create, cancel } = {}) {
  let list = Array.isArray(appointments) ? [...appointments] : null;
  return stubFetch(async (url, init = {}) => {
    const path = url.replace(/^.*\/api/, '');
    const method = init.method ?? 'GET';
    if (method === 'GET' && path.startsWith('/appointments?')) return reply(list ?? appointments);
    if (method === 'GET' && path.startsWith('/availability/free?')) return reply(free);
    if (method === 'POST' && path === '/appointments') {
      const body = bodyOf(init);
      const custom = await create?.(body);
      if (custom) return custom;
      const created = appt({ id: 'new', status: 'pending', scheduled_at: body.scheduled_at, notes: body.notes ?? null });
      list = [...(list ?? []), created];
      return jsonResponse(201, { data: created });
    }
    const patch = /^\/appointments\/([^/?]+)$/.exec(path);
    if (method === 'PATCH' && patch) {
      const custom = await cancel?.(patch[1], bodyOf(init));
      if (custom) return custom;
      list = (list ?? []).map((a) => (a.id === patch[1] ? { ...a, status: bodyOf(init).status } : a));
      return jsonResponse(200, { data: list.find((a) => a.id === patch[1]) });
    }
    return errorResponse(500, 'INTERNAL', 'Sin handler');
  });
}

/** Abre Mis turnos con el stub de arriba. */
export function openMyAppointments(options) {
  const fetchMock = stubStudentAgenda(options);
  return { fetchMock, ...renderRoute('/alumno/turnos') };
}

/** Pedidos que coinciden con `method` y el comienzo del path. */
export const requests = (fetchMock, method, prefix) =>
  fetchMock.mock.calls.filter(
    ([url, init = {}]) => (init.method ?? 'GET') === method && url.replace(/^.*\/api/, '').startsWith(prefix),
  );

/** Respuesta que nunca llega (deja la carga a medias). */
export const never = () => new Promise(() => {});
