import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { api } from '@/api/shared/client';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';
import { resetAuthStore, savedSession, seedSavedSession } from '../../../helpers/auth/authStore';

const state = () => useAuthStore.getState();
const STUDENT = { id: 's-1', email: 'ana@fit.com', name: 'Ana', role: 'student', must_change_password: true };
const CHANGED_AT = '2026-11-09T15:00:00.000Z';

beforeEach(() => resetAuthStore());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useAuthStore: changePassword', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: STUDENT, token: 'access-1', refreshToken: 'refresh-1', status: 'authenticated' });
  });

  it('manda el refresh del store, guarda el token nuevo, apaga el flag y setea password_changed_at', async () => {
    const fetchMock = stubFetch(async () =>
      jsonResponse(200, { token: 'access-2', expires_in: '1h', password_changed_at: CHANGED_AT }),
    );
    await state().changePassword({ current_password: 'Temp0ral9X', new_password: 'Nuev4clave' });
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/auth/password');
    expect(bodyOf(init)).toEqual({
      current_password: 'Temp0ral9X',
      new_password: 'Nuev4clave',
      refresh_token: 'refresh-1',
    });
    expect(state()).toMatchObject({
      token: 'access-2',
      refreshToken: 'refresh-1',
      status: 'authenticated',
      user: { ...STUDENT, must_change_password: false, password_changed_at: CHANGED_AT },
    });
    expect(savedSession().user.must_change_password).toBe(false);
  });

  it('con un 400 tira el ApiError y deja la sesión intacta', async () => {
    stubFetch(async () =>
      errorResponse(400, 'VALIDATION_ERROR', 'Error de validación', [
        { field: 'current_password', message: 'La contraseña actual es incorrecta' },
      ]),
    );
    const before = state();
    await expect(
      state().changePassword({ current_password: 'mal', new_password: 'Nuev4clave' }),
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect(state()).toMatchObject({ user: before.user, token: 'access-1', refreshToken: 'refresh-1' });
  });
});

describe('useAuthStore: el flag viaja en el refresh', () => {
  it('restore() copia must_change_password del refresh al user guardado', async () => {
    await seedSavedSession({ user: { ...STUDENT, must_change_password: false }, refreshToken: 'refresh-1' });
    stubFetch(async () => jsonResponse(200, { token: 'access-9', expires_in: '1h', must_change_password: true }));
    await state().restore();
    expect(state()).toMatchObject({ token: 'access-9', status: 'authenticated' });
    expect(state().user.must_change_password).toBe(true);
  });

  it('restore() sin el campo en la respuesta no toca el user', async () => {
    await seedSavedSession({ user: { ...STUDENT, must_change_password: undefined }, refreshToken: 'refresh-1' });
    stubFetch(async () => jsonResponse(200, { token: 'access-9', expires_in: '1h' }));
    await state().restore();
    expect(state().user).not.toHaveProperty('must_change_password', true);
    expect(state().user.must_change_password).toBeUndefined();
  });

  it('la renovación ante un 401 también copia el flag', async () => {
    useAuthStore.setState({
      user: { ...STUDENT, must_change_password: false },
      token: 'viejo',
      refreshToken: 'refresh-1',
      status: 'authenticated',
    });
    stubFetch(async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse(200, { token: 'access-3', expires_in: '1h', must_change_password: true });
      }
      return init.headers.Authorization === 'Bearer viejo'
        ? errorResponse(401, 'UNAUTHORIZED')
        : jsonResponse(200, { data: 1 });
    });
    await api.get('/x');
    expect(state().token).toBe('access-3');
    expect(state().user.must_change_password).toBe(true);
  });
});
