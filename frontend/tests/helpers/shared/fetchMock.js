import { vi } from 'vitest';

export const API_URL = 'http://api.test/api';

/** Respuesta JSON como la del backend. `null` en 204. */
export function jsonResponse(status, body) {
  if (status === 204) return new Response(null, { status });
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Respuesta de error con el formato `{ error: { code, message, details } }`. */
export function errorResponse(status, code, message = code, details) {
  return jsonResponse(status, { error: { code, message, details } });
}

/**
 * Stub de `fetch` + `VITE_API_URL`. Llamar a `vi.unstubAllGlobals/Envs` en el afterEach.
 * El badge de "Mensajes" del sidebar consulta `/messages/unread-count` en toda pantalla con layout:
 * esa ruta se contesta aparte (`unread` no leídos, 0 por defecto; `unread: null` la deja pasar a `impl`) y no llega a `impl` ni a las llamadas del mock.
 */
export function stubFetch(impl, { unread = 0 } = {}) {
  vi.stubEnv('VITE_API_URL', API_URL);
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', (url, init) =>
    unread !== null && String(url).endsWith('/messages/unread-count')
      ? Promise.resolve(jsonResponse(200, { data: { count: unread } }))
      : fetchMock(url, init),
  );
  return fetchMock;
}

/** Lista de [path, init] de cada llamada, sin la base. */
export function calls(fetchMock) {
  return fetchMock.mock.calls.map(([url, init]) => [url.replace(API_URL, ''), init]);
}

/** Body JSON parseado de una llamada. */
export function bodyOf(init) {
  return init.body ? JSON.parse(init.body) : undefined;
}
