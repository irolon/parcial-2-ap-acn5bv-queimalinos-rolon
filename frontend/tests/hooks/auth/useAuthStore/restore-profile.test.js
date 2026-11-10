import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';
import { USER, resetAuthStore, savedSession, seedSavedSession } from '../../../helpers/auth/authStore';

// GX2: la foto del sidebar es una URL firmada que vence en 1 h y el user vive en localStorage. Al restaurar la
// sesión de un alumno se trae su ficha para tener la foto (y el nombre) vigentes sin pasar por Mi perfil.
const state = () => useAuthStore.getState();
const STUDENT = { id: 's-1', email: 'ana@fit.com', name: 'Ana', role: 'student', avatar_url: 'https://x/vieja?token=1' };
const FRESH = 'https://x/nueva?token=2';

beforeEach(() => resetAuthStore());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const route = (detail) =>
  stubFetch(async (url) => {
    if (url.endsWith('/auth/refresh')) return jsonResponse(200, { token: 'access-9', expires_in: '1h' });
    return detail();
  });

describe('useAuthStore: restore refresca la ficha del alumno', () => {
  it('trae GET /students/:id con el access nuevo y copia nombre y foto firmada', async () => {
    await seedSavedSession({ user: STUDENT, refreshToken: 'refresh-1' });
    const fetchMock = route(async () => jsonResponse(200, { data: { id: 's-1', name: 'Ana P.', avatar_url: FRESH } }));
    await state().restore();
    const [, [path, init]] = calls(fetchMock);
    expect(path).toBe('/students/s-1');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer access-9');
    expect(state()).toMatchObject({ status: 'authenticated', user: { ...STUDENT, name: 'Ana P.', avatar_url: FRESH } });
    expect(savedSession().user.avatar_url).toBe(FRESH);
  });

  it('si la ficha falla, la sesión queda igual (authenticated, user guardado)', async () => {
    await seedSavedSession({ user: STUDENT, refreshToken: 'refresh-1' });
    route(async () => errorResponse(500, 'INTERNAL_ERROR'));
    await state().restore();
    expect(state()).toMatchObject({ status: 'authenticated', token: 'access-9', user: STUDENT });
  });

  it('si mientras tanto entró otra cuenta, no le pisa el user', async () => {
    await seedSavedSession({ user: STUDENT, refreshToken: 'refresh-1' });
    const other = { id: 's-2', name: 'Bruno', role: 'student' };
    route(async () => {
      useAuthStore.setState({ user: other, refreshToken: 'refresh-2' });
      return jsonResponse(200, { data: { id: 's-1', name: 'Ana P.', avatar_url: FRESH } });
    });
    await state().restore();
    expect(state().user).toEqual(other);
  });

  it('con la clave blanqueada (must_change_password) no pide la ficha', async () => {
    await seedSavedSession({ user: STUDENT, refreshToken: 'refresh-1' });
    const fetchMock = stubFetch(async () => jsonResponse(200, { token: 'a', expires_in: '1h', must_change_password: true }));
    await state().restore();
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/auth/refresh']);
  });

  it('un trainer no pide la ficha', async () => {
    await seedSavedSession({ user: USER, refreshToken: 'refresh-1' });
    const fetchMock = route(async () => jsonResponse(200, {}));
    await state().restore();
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/auth/refresh']);
  });
});
