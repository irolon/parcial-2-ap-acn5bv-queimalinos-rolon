import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { api } from '@/api/shared/client';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import {
  LOGIN_RESPONSE,
  USER,
  resetAuthStore,
  savedSession,
  seedSavedSession,
} from '../../helpers/auth/authStore';

const state = () => useAuthStore.getState();

beforeEach(() => resetAuthStore());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useAuthStore: login', () => {
  it('guarda user, token y refresh; persiste solo user y refresh', async () => {
    stubFetch(async () => jsonResponse(200, LOGIN_RESPONSE));
    await expect(state().login({ email: 'pt@fit.com', password: 'x' })).resolves.toEqual(USER);
    expect(state()).toMatchObject({
      user: USER,
      token: 'access-1',
      refreshToken: 'refresh-1',
      status: 'authenticated',
    });
    expect(savedSession()).toEqual({ user: USER, refreshToken: 'refresh-1' });
    expect(localStorage.getItem('fittrainer.session')).not.toContain('access-1');
  });

  it('si falla, tira el error normalizado y queda anonymous', async () => {
    stubFetch(async () => errorResponse(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas'));
    await expect(state().login({ email: 'a@b.com', password: 'mal' })).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
    expect(state()).toMatchObject({ user: null, token: null, status: 'anonymous' });
  });
});

describe('useAuthStore: logout', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: USER, token: 'access-1', refreshToken: 'refresh-1', status: 'authenticated' });
  });

  it('llama a /auth/logout con el refresh y limpia todo', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(204));
    await state().logout();
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/auth/logout');
    expect(bodyOf(init)).toEqual({ refresh_token: 'refresh-1' });
    expect(init.headers.Authorization).toBe('Bearer access-1');
    expect(state()).toMatchObject({ user: null, token: null, refreshToken: null, status: 'anonymous' });
    expect(savedSession()).toEqual({ user: null, refreshToken: null });
  });

  it('limpia el estado local aunque la API falle', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    await state().logout();
    expect(state()).toMatchObject({ user: null, token: null, refreshToken: null, status: 'anonymous' });
  });
});

describe('useAuthStore: restore', () => {
  it('con refresh guardado pide un access nuevo y queda authenticated', async () => {
    await seedSavedSession();
    const fetchMock = stubFetch(async () => jsonResponse(200, { token: 'access-9', expires_in: '1h' }));
    const pending = state().restore();
    expect(state().status).toBe('loading');
    await pending;
    expect(calls(fetchMock)[0][0]).toBe('/auth/refresh');
    expect(state()).toMatchObject({ user: USER, token: 'access-9', status: 'authenticated' });
    expect(savedSession()).toEqual({ user: USER, refreshToken: 'refresh-1' });
  });

  it('si el refresh falla, queda anonymous y limpia lo guardado', async () => {
    await seedSavedSession();
    stubFetch(async () => errorResponse(401, 'UNAUTHORIZED'));
    await state().restore();
    expect(state()).toMatchObject({ user: null, token: null, refreshToken: null, status: 'anonymous' });
    expect(savedSession()).toEqual({ user: null, refreshToken: null });
  });

  it('sin sesión guardada queda anonymous sin llamar a la API', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, {}));
    await state().restore();
    expect(state().status).toBe('anonymous');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useAuthStore + client', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: USER, token: 'viejo', refreshToken: 'refresh-1', status: 'authenticated' });
  });

  it('un 401 renueva con el refresh del store y reintenta con el token nuevo', async () => {
    const fetchMock = stubFetch(async (url, init) => {
      if (url.endsWith('/auth/refresh')) return jsonResponse(200, { token: 'nuevo', expires_in: '1h' });
      return init.headers.Authorization === 'Bearer nuevo'
        ? jsonResponse(200, { ok: true })
        : errorResponse(401, 'UNAUTHORIZED');
    });
    await expect(api.get('/students')).resolves.toEqual({ ok: true });
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/students', '/auth/refresh', '/students']);
    expect(state().token).toBe('nuevo');
  });

  it('si la renovación falla, hace logout y el status pasa a anonymous', async () => {
    stubFetch(async () => errorResponse(401, 'UNAUTHORIZED'));
    await expect(api.get('/students')).rejects.toMatchObject({ status: 401 });
    await vi.waitFor(() => expect(state().status).toBe('anonymous'));
    expect(state()).toMatchObject({ user: null, token: null, refreshToken: null });
  });
});
