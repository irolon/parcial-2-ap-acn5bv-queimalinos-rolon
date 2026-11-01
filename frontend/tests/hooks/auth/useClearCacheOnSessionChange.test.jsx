import { beforeEach, describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useClearCacheOnSessionChange } from '@/hooks/auth/useClearCacheOnSessionChange';
import { resetAuthStore } from '../../helpers/auth/authStore';

const PT_A = { id: 't-a', name: 'A', role: 'trainer' };
const PT_B = { id: 't-b', name: 'B', role: 'trainer' };
const setUser = (user) => act(() => useAuthStore.setState({ user }));

let queryClient;
beforeEach(() => {
  resetAuthStore();
  useAuthStore.setState({ user: PT_A, status: 'authenticated' });
  queryClient = new QueryClient();
  queryClient.setQueryData(['messages', 'conversations'], [{ student: 'de A' }]);
  renderHook(() => useClearCacheOnSessionChange(queryClient));
});

describe('useClearCacheOnSessionChange', () => {
  it('al cerrar sesión borra la caché', async () => {
    await act(() => useAuthStore.getState().logout());
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('al entrar con otro usuario borra la caché del anterior', () => {
    setUser(PT_B);
    expect(queryClient.getQueryData(['messages', 'conversations'])).toBeUndefined();
  });

  it('con el mismo usuario (renovar token, editar perfil) no la toca', () => {
    setUser({ ...PT_A, name: 'A2' });
    act(() => useAuthStore.setState({ token: 'nuevo' }));
    expect(queryClient.getQueryData(['messages', 'conversations'])).toEqual([{ student: 'de A' }]);
  });

  it('al desmontar deja de escuchar', () => {
    const q = new QueryClient();
    q.setQueryData(['x'], 1);
    const { unmount } = renderHook(() => useClearCacheOnSessionChange(q));
    unmount();
    setUser(PT_B);
    expect(q.getQueryData(['x'])).toBe(1);
  });
});
