import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { resetAuthStore, savedSession } from '../../../helpers/auth/authStore';

const state = () => useAuthStore.getState();
const STUDENT = { id: 's-1', email: 'ana@fit.com', name: 'Ana', role: 'student' };

beforeEach(() => resetAuthStore());

describe('useAuthStore: updateUser', () => {
  it('cambia solo los campos pasados y lo persiste', () => {
    useAuthStore.setState({ user: STUDENT, token: 'access-1', refreshToken: 'refresh-1', status: 'authenticated' });
    state().updateUser({ name: 'Ana P.' });
    expect(state().user).toEqual({ ...STUDENT, name: 'Ana P.' });
    expect(state().token).toBe('access-1');
    expect(savedSession().user.name).toBe('Ana P.');
  });

  it('sin sesión no hace nada', () => {
    state().updateUser({ name: 'Ana P.' });
    expect(state().user).toBeNull();
  });
});
