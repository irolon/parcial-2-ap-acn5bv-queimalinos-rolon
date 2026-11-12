import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { api } from '@/api/shared/client';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';
import { USER, resetAuthStore, savedSession } from '../../../helpers/auth/authStore';

// Respuestas que llegan después de cerrar sesión (o de que entre otra cuenta) no reviven ni pisan la sesión actual.
const state = () => useAuthStore.getState();
const SESSION = { user: USER, token: 'access-1', refreshToken: 'refresh-1', status: 'authenticated' };
const EMPTY = { user: null, token: null, refreshToken: null, status: 'anonymous' };
const OTHER = { user: { ...USER, id: 'u-2' }, token: 'access-b', refreshToken: 'refresh-b', status: 'authenticated' };
const hanging = () => new Promise(() => {});

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// 401 en /students arranca la renovación; `refresh` queda pendiente hasta que el test la resuelva.
function stubRenewal(refresh) {
  return stubFetch(async (url) => {
    if (url.endsWith('/auth/refresh')) return refresh.promise;
    if (url.endsWith('/auth/logout')) return jsonResponse(204);
    return errorResponse(401, 'UNAUTHORIZED');
  });
}

beforeEach(() => resetAuthStore());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useAuthStore: logout() no espera al backend', () => {
  it('limpia la sesión en el acto aunque /auth/logout quede colgado, y manda la revocación con el refresh', async () => {
    useAuthStore.setState(SESSION);
    const fetchMock = stubFetch(hanging);
    const done = await Promise.race([state().logout().then(() => 'listo'), new Promise((r) => setTimeout(r, 50))]);
    expect(done).toBe('listo');
    expect(state()).toMatchObject(EMPTY);
    expect(savedSession()).toEqual({ user: null, refreshToken: null });
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/auth/logout');
    expect(bodyOf(init)).toEqual({ refresh_token: 'refresh-1' });
  });

  it('offline: logout colgado + reintento que sale bien → queda anonymous', async () => {
    useAuthStore.setState({ ...SESSION, token: null, status: 'offline' });
    stubFetch(async (url) => (url.endsWith('/auth/logout') ? hanging() : jsonResponse(200, { token: 'tarde' })));
    const retrying = state().retry();
    state().logout();
    await retrying;
    expect(state()).toMatchObject(EMPTY);
  });
});

describe('useAuthStore + client: la renovación falla después de cerrar sesión', () => {
  it('logout durante una renovación que después da 502 → queda anonymous', async () => {
    useAuthStore.setState(SESSION);
    const refresh = deferred();
    const fetchMock = stubRenewal(refresh);
    const pending = api.get('/students');
    await vi.waitFor(() => expect(calls(fetchMock).map(([p]) => p)).toContain('/auth/refresh'));
    await state().logout();
    refresh.resolve(errorResponse(502, 'HTTP_ERROR'));
    await expect(pending).rejects.toMatchObject({ status: 401 });
    await new Promise((r) => setTimeout(r, 0));
    expect(state()).toMatchObject(EMPTY);
  });

  it('si entró otra cuenta y la renovación de la anterior da 401, no cierra la sesión nueva', async () => {
    useAuthStore.setState(SESSION);
    const refresh = deferred();
    const fetchMock = stubRenewal(refresh);
    const pending = api.get('/students');
    await vi.waitFor(() => expect(calls(fetchMock).map(([p]) => p)).toContain('/auth/refresh'));
    useAuthStore.setState(OTHER);
    refresh.resolve(errorResponse(401, 'UNAUTHORIZED'));
    await expect(pending).rejects.toMatchObject({ status: 401 });
    await new Promise((r) => setTimeout(r, 0));
    expect(state()).toMatchObject(OTHER);
    expect(calls(fetchMock).map(([p]) => p)).not.toContain('/auth/logout');
  });
});
