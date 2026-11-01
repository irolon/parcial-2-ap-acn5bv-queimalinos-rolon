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
 * Arma la respuesta de un GET falso: `answer` es el dato (200), un status de error (número, da un error con ese status)
 * o una función (también async) que lo arma en cada pedido.
 */
export async function reply(answer) {
  const value = await (typeof answer === 'function' ? answer() : answer);
  return typeof value === 'number' ? errorResponse(value, 'INTERNAL') : jsonResponse(200, { data: value });
}

/** Stub de `fetch` + `VITE_API_URL`. Llamar a `vi.unstubAllGlobals/Envs` en el afterEach. */
export function stubFetch(impl) {
  vi.stubEnv('VITE_API_URL', API_URL);
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
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
