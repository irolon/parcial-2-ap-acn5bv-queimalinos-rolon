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

// GX4: la web abre la sesión al empezar (POST /sessions sin finished_at) y la borra al descartar (DELETE /sessions/:id).
const isOpening = (url, init) =>
  init?.method === 'POST' && String(url).endsWith('/sessions') && !JSON.parse(init.body ?? '{}').finished_at;
const isDiscard = (url, init) => init?.method === 'DELETE' && /\/sessions\/[^/]+$/.test(String(url));

/** Lo que contesta el stub sin pasar por `impl`, o null si el pedido va a `impl`. */
function answerAside(url, init, { unread, openSessions }) {
  if (unread !== null && String(url).endsWith('/messages/unread-count')) return jsonResponse(200, { data: { count: unread } });
  if (openSessions && isOpening(url, init)) return jsonResponse(201, { data: { ...JSON.parse(init.body), unlocked_achievements: [] } });
  if (openSessions && isDiscard(url, init)) return jsonResponse(204);
  return null;
}

/**
 * Stub de `fetch` + `VITE_API_URL`. Llamar a `vi.unstubAllGlobals/Envs` en el afterEach.
 * Se contestan aparte, sin llegar a `impl` ni a las llamadas del mock:
 * - `/messages/unread-count`, que el badge de "Mensajes" del sidebar consulta en toda pantalla con layout (`unread` no
 *   leídos, 0 por defecto; `unread: null` la deja pasar a `impl`);
 * - la apertura y el descarte de la sesión en curso (GX4), así los tests que cuentan `POST /sessions` miran solo el que
 *   trae `finished_at` (`openSessions: false` los deja pasar a `impl`).
 */
export function stubFetch(impl, { unread = 0, openSessions = true } = {}) {
  vi.stubEnv('VITE_API_URL', API_URL);
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', (url, init) => {
    const aside = answerAside(url, init, { unread, openSessions });
    return aside ? Promise.resolve(aside) : fetchMock(url, init);
  });
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
