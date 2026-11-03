import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, configureClient, request } from '@/api/shared/client';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';

let token;
let hooks;

beforeEach(() => {
  token = 'access-1';
  hooks = {
    getToken: vi.fn(() => token),
    refreshSession: vi.fn(async () => {
      token = 'access-2';
    }),
    onAuthFailure: vi.fn(),
  };
  configureClient(hooks);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('client: request', () => {
  it('usa VITE_API_URL, manda JSON y el Bearer del store', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { ok: true }));
    const data = await api.post('/students', { name: 'Ana' });
    expect(data).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/students');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'Ana' }));
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer access-1',
    });
  });

  it('no manda Authorization sin token ni con auth: false', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, {}));
    token = null;
    await api.get('/a');
    token = 'access-1';
    await request('/b', { auth: false });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  });

  it('devuelve null en un 204', async () => {
    stubFetch(async () => jsonResponse(204));
    await expect(api.delete('/x')).resolves.toBeNull();
  });
});

describe('client: errores', () => {
  it('normaliza el error del backend a { status, code, message, details }', async () => {
    const details = [{ field: 'email', message: 'Requerido' }];
    stubFetch(async () => errorResponse(400, 'VALIDATION_ERROR', 'Datos inválidos', details));
    const err = await api.post('/x', {}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message: 'Datos inválidos', details });
  });

  it('usa valores por defecto si el error no tiene el formato del backend', async () => {
    stubFetch(async () => new Response('<html>', { status: 502 }));
    await expect(api.get('/x')).rejects.toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
      message: 'Error inesperado del servidor',
      details: null,
    });
  });

  it('red caída → NETWORK_ERROR con status 0', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(api.get('/x')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No hay conexión con el servidor',
    });
  });

  it('un 401 que no es UNAUTHORIZED no renueva', async () => {
    stubFetch(async () => errorResponse(401, 'INVALID_CREDENTIALS'));
    await expect(api.get('/x')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(hooks.refreshSession).not.toHaveBeenCalled();
  });
});

describe('client: renovación de sesión', () => {
  it('ante 401 UNAUTHORIZED renueva y reintenta con el token nuevo', async () => {
    const fetchMock = stubFetch(async (url, init) =>
      init.headers.Authorization === 'Bearer access-2'
        ? jsonResponse(200, { ok: true })
        : errorResponse(401, 'UNAUTHORIZED'),
    );
    await expect(api.get('/students')).resolves.toEqual({ ok: true });
    expect(hooks.refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer access-2');
  });

  it('dos 401 simultáneos comparten una sola renovación y reintentan una vez cada uno', async () => {
    let release;
    hooks.refreshSession.mockImplementation(
      () => new Promise((resolve) => {
        release = () => {
          token = 'access-2';
          resolve();
        };
      }),
    );
    const fetchMock = stubFetch(async (url, init) =>
      init.headers.Authorization === 'Bearer access-2'
        ? jsonResponse(200, { url })
        : errorResponse(401, 'UNAUTHORIZED'),
    );
    const both = Promise.all([api.get('/a'), api.get('/b')]);
    await vi.waitFor(() => expect(release).toBeDefined());
    await new Promise((r) => setTimeout(r, 0));
    release();
    const [a, b] = await both;
    expect(a.url).toMatch(/\/a$/);
    expect(b.url).toMatch(/\/b$/);
    expect(hooks.refreshSession).toHaveBeenCalledTimes(1);
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/a', '/b', '/a', '/b']);
  });

  it('si el reintento vuelve a dar 401, no entra en bucle', async () => {
    const fetchMock = stubFetch(async () => errorResponse(401, 'UNAUTHORIZED'));
    await expect(api.get('/x')).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(hooks.refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('si la renovación falla, avisa una sola vez y tira el 401 original', async () => {
    hooks.refreshSession.mockRejectedValue(new Error('refresh vencido'));
    stubFetch(async () => errorResponse(401, 'UNAUTHORIZED', 'Token vencido'));
    const results = await Promise.allSettled([api.get('/a'), api.get('/b')]);
    expect(results.map((r) => r.reason.message)).toEqual(['Token vencido', 'Token vencido']);
    expect(hooks.refreshSession).toHaveBeenCalledTimes(1);
    expect(hooks.onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('con refresh: false no renueva', async () => {
    stubFetch(async () => errorResponse(401, 'UNAUTHORIZED'));
    await expect(request('/auth/logout', { method: 'POST', refresh: false })).rejects.toMatchObject({
      status: 401,
    });
    expect(hooks.refreshSession).not.toHaveBeenCalled();
  });
});
