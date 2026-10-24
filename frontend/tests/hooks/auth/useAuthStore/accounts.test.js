import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';
import { resetAuthStore, savedSession } from '../../../helpers/auth/authStore';

const state = () => useAuthStore.getState();
const TRAINER = { id: 't-1', email: 'pt@fit.com', name: 'Pablo' };
const STUDENT = { id: 's-1', email: 'ana@fit.com', name: 'Ana' };

beforeEach(() => resetAuthStore());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useAuthStore: register', () => {
  it('guarda la sesión como trainer, sin persistir el token', async () => {
    const fetchMock = stubFetch(async () =>
      jsonResponse(201, { trainer: TRAINER, token: 'access-1', refresh_token: 'refresh-1' }),
    );
    const user = await state().register({ name: 'Pablo', email: 'pt@fit.com', password: 'x', specialty: 'Fuerza' });
    expect(user).toEqual({ ...TRAINER, role: 'trainer' });
    expect(calls(fetchMock)[0][0]).toBe('/auth/register');
    expect(bodyOf(calls(fetchMock)[0][1]).email).toBe('pt@fit.com');
    expect(state()).toMatchObject({ user, token: 'access-1', refreshToken: 'refresh-1', status: 'authenticated' });
    expect(savedSession()).toEqual({ user, refreshToken: 'refresh-1' });
    expect(localStorage.getItem('fittrainer.session')).not.toContain('access-1');
  });

  it('si falla, relanza el error y no guarda sesión', async () => {
    stubFetch(async () => errorResponse(409, 'EMAIL_ALREADY_EXISTS'));
    await expect(state().register({ email: 'pt@fit.com' })).rejects.toMatchObject({ code: 'EMAIL_ALREADY_EXISTS' });
    expect(state()).toMatchObject({ user: null, token: null, refreshToken: null });
    expect(state().status).not.toBe('authenticated');
    expect(localStorage.getItem('fittrainer.session')).toBeNull();
  });
});

describe('useAuthStore: joinFromInvitation', () => {
  it('guarda la sesión como student, sin persistir el token', async () => {
    const fetchMock = stubFetch(async () =>
      jsonResponse(201, { student: STUDENT, token: 'access-2', refresh_token: 'refresh-2' }),
    );
    const user = await state().joinFromInvitation({ token: 'tok', password: 'x12345678' });
    expect(user).toEqual({ ...STUDENT, role: 'student' });
    expect(calls(fetchMock)[0][0]).toBe('/students');
    expect(state()).toMatchObject({ user, token: 'access-2', refreshToken: 'refresh-2', status: 'authenticated' });
    expect(savedSession()).toEqual({ user, refreshToken: 'refresh-2' });
    expect(localStorage.getItem('fittrainer.session')).not.toContain('access-2');
  });

  it('si falla, relanza el error y no guarda sesión', async () => {
    stubFetch(async () => errorResponse(410, 'INVITATION_ALREADY_USED'));
    await expect(state().joinFromInvitation({ token: 'tok', password: 'x' })).rejects.toMatchObject({
      status: 410,
      code: 'INVITATION_ALREADY_USED',
    });
    expect(state()).toMatchObject({ user: null, token: null, refreshToken: null });
    expect(state().status).not.toBe('authenticated');
    expect(localStorage.getItem('fittrainer.session')).toBeNull();
  });
});
