// Único lugar que arma `Authorization` y habla con la API.
// El store de auth se registra con `configureClient` (así no hay import circular).

export class ApiError extends Error {
  constructor({ status, code, message, details = null }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const NETWORK_ERROR = {
  status: 0,
  code: 'NETWORK_ERROR',
  message: 'No hay conexión con el servidor',
};

const defaultHooks = {
  getToken: () => null,
  refreshSession: async () => {
    throw new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'Sesión expirada' });
  },
  onAuthFailure: () => {},
};

let hooks = { ...defaultHooks };
let refreshing = null;

/**
 * Registra cómo leer el token, cómo renovar la sesión y qué hacer si la renovación falla.
 * @param {{ getToken?: () => string|null, refreshSession?: () => Promise<unknown>, onAuthFailure?: () => void }} next
 */
export function configureClient(next) {
  hooks = { ...defaultHooks, ...next };
  refreshing = null;
}

// Todas las llamadas que reciben 401 a la vez esperan la misma renovación.
function sharedRefresh() {
  if (!refreshing) {
    refreshing = Promise.resolve()
      .then(() => hooks.refreshSession())
      .catch((err) => {
        hooks.onAuthFailure();
        throw err;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function readBody(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function send(path, { method, body, auth, signal }) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? hooks.getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError(NETWORK_ERROR);
  }

  const data = await readBody(res);
  if (res.ok) return data;
  const error = data?.error ?? {};
  throw new ApiError({
    status: res.status,
    code: error.code ?? 'HTTP_ERROR',
    message: error.message ?? 'Error inesperado del servidor',
    details: error.details ?? null,
  });
}

/**
 * Hace una llamada JSON a la API.
 * - `auth` (default true): manda `Authorization: Bearer <token>` si hay token.
 * - `refresh` (default true): ante 401 `UNAUTHORIZED`, renueva una vez y reintenta.
 *   Las rutas de `/auth/*` lo apagan para no entrar en bucle.
 * Devuelve el JSON de la respuesta (o `null` en 204); si falla, tira un `ApiError`.
 */
export async function request(path, { method = 'GET', body, auth = true, refresh = true, signal } = {}) {
  const options = { method, body, auth, signal };
  try {
    return await send(path, options);
  } catch (err) {
    const expired = err instanceof ApiError && err.status === 401 && err.code === 'UNAUTHORIZED';
    if (!expired || !auth || !refresh) throw err;
    try {
      await sharedRefresh();
    } catch {
      throw err;
    }
    return send(path, options);
  }
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
