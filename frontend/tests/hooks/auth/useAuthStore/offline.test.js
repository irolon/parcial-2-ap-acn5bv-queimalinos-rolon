import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { api } from '@/api/shared/client';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';
import { USER, resetAuthStore, savedSession, seedSavedSession } from '../../../helpers/auth/authStore';

// GX9 (c): sin respuesta del servidor la sesión queda `offline` (guardada, sin verificar) y se reintenta.
const state = () => useAuthStore.getState();
const networkDown = async () => {
  throw new TypeError('Failed to fetch');
};
const OFFLINE = { user: USER, token: null, refreshToken: 'refresh-1', status: 'offline' };
const EMPTY = { user: null, token: null, refreshToken: null, status: 'anonymous' };
const setOffline = () => useAuthStore.setState(OFFLINE);

beforeEach(() => resetAuthStore());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useAuthStore: restore() sin respuesta del servidor', () => {
  it.each([
    ['red caída', networkDown],
    ['429', async () => errorResponse(429, 'RATE_LIMIT_EXCEEDED')],
    ['502', async () => errorResponse(502, 'HTTP_ERROR')],
    ['503', async () => errorResponse(503, 'HTTP_ERROR')],
  ])('con %s queda offline y conserva user y refresh', async (_, respond) => {
    await seedSavedSession();
    stubFetch(respond);
    await state().restore();
    expect(state()).toMatchObject(OFFLINE);
    expect(savedSession()).toEqual({ user: USER, refreshToken: 'refresh-1' });
  });

  it('con 401 queda anonymous y borra la sesión', async () => {
    await seedSavedSession();
    stubFetch(async () => errorResponse(401, 'UNAUTHORIZED'));
    await state().restore();
    expect(state()).toMatchObject(EMPTY);
    expect(savedSession()).toEqual({ user: null, refreshToken: null });
  });
});

describe('useAuthStore: retry()', () => {
  it('si el refresh responde, pasa a authenticated sin pasar por loading', async () => {
    setOffline();
    const seen = [];
    const unsubscribe = useAuthStore.subscribe((s) => seen.push(s.status));
    const fetchMock = stubFetch(async () => jsonResponse(200, { token: 'access-9', expires_in: '1h' }));
    await state().retry();
    unsubscribe();
    expect(calls(fetchMock)[0][0]).toBe('/auth/refresh');
    expect(state()).toMatchObject({ user: USER, token: 'access-9', status: 'authenticated' });
    expect(seen).not.toContain('loading');
  });

  it('si sigue sin respuesta, queda offline', async () => {
    setOffline();
    stubFetch(async () => errorResponse(504, 'HTTP_ERROR'));
    await state().retry();
    expect(state()).toMatchObject(OFFLINE);
  });

  it('si el servidor rechaza el refresh (401), queda anonymous y borra la sesión', async () => {
    setOffline();
    stubFetch(async () => errorResponse(401, 'UNAUTHORIZED'));
    await state().retry();
    expect(state()).toMatchObject(EMPTY);
  });

  it('fuera de offline no hace nada', async () => {
    useAuthStore.setState({ ...OFFLINE, token: 'access-1', status: 'authenticated' });
    const fetchMock = stubFetch(async () => jsonResponse(200, { token: 'otro' }));
    await state().retry();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state().token).toBe('access-1');
  });

  it('si cierra sesión mientras reintenta, la respuesta no revive la sesión', async () => {
    setOffline();
    stubFetch(async (url) => {
      if (url.endsWith('/auth/refresh')) {
        useAuthStore.setState(EMPTY); // tocó "Cerrar sesión" mientras tanto
        return jsonResponse(200, { token: 'tarde' });
      }
      return jsonResponse(204);
    });
    await state().retry();
    expect(state()).toMatchObject(EMPTY);
  });
});

describe('useAuthStore + client: la renovación falla a mitad de uso', () => {
  it('con 502 del refresh pasa a offline sin hacer logout', async () => {
    useAuthStore.setState({ ...OFFLINE, token: 'viejo', status: 'authenticated' });
    const fetchMock = stubFetch(async (url) =>
      url.endsWith('/auth/refresh') ? errorResponse(502, 'HTTP_ERROR') : errorResponse(401, 'UNAUTHORIZED'),
    );
    await expect(api.get('/students')).rejects.toMatchObject({ status: 401 });
    await vi.waitFor(() => expect(state().status).toBe('offline'));
    expect(state()).toMatchObject(OFFLINE);
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/students', '/auth/refresh']);
  });
});
