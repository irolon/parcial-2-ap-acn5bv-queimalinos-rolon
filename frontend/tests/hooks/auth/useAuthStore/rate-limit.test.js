import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { api } from '@/api/shared/client';
import { calls, errorResponse, stubFetch } from '../../../helpers/shared/fetchMock';
import { USER, resetAuthStore, savedSession, seedSavedSession } from '../../../helpers/auth/authStore';

// Un 429 del refresh es temporal (cupo por IP compartido, muchas recargas): la sesión no se
// pierde, igual que sin conexión: queda `offline` y se reintenta (GX9 c).
const state = () => useAuthStore.getState();
const rateLimited = () => errorResponse(429, 'RATE_LIMIT_EXCEEDED', 'Demasiados intentos.');

beforeEach(() => resetAuthStore());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useAuthStore: refresh con 429', () => {
  it('restore() queda offline y conserva user y refresh guardados', async () => {
    await seedSavedSession();
    stubFetch(async () => rateLimited());
    await state().restore();
    expect(state()).toMatchObject({ user: USER, token: null, refreshToken: 'refresh-1', status: 'offline' });
    expect(savedSession()).toEqual({ user: USER, refreshToken: 'refresh-1' });
  });

  it('si la renovación ante un 401 da 429, no hace logout ni llama a /auth/logout', async () => {
    useAuthStore.setState({ user: USER, token: 'viejo', refreshToken: 'refresh-1', status: 'authenticated' });
    const fetchMock = stubFetch(async (url) =>
      url.endsWith('/auth/refresh') ? rateLimited() : errorResponse(401, 'UNAUTHORIZED'),
    );
    await expect(api.get('/students')).rejects.toMatchObject({ status: 401 });
    await vi.waitFor(() => expect(state().status).toBe('offline'));
    expect(state()).toMatchObject({ user: USER, token: null, refreshToken: 'refresh-1' });
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/students', '/auth/refresh']);
  });
});
