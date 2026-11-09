import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ME_KEY, useTrainerProfile } from '@/hooks/account/useTrainerProfile';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { configureClient } from '@/api/shared/client';
import { bodyOf, calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { resetAuthStore } from '../../helpers/auth/authStore';

const ME = { id: 't-1', name: 'Laura Gómez', email: 'laura@fit.com', professional_title: null };

function renderProfile() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { queryClient, ...renderHook(() => useTrainerProfile(), { wrapper }) };
}

beforeEach(() => {
  resetAuthStore();
  useAuthStore.setState({ user: { ...ME, role: 'trainer' }, token: 'access-1', status: 'authenticated' });
  configureClient({ getToken: () => 'access-1' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useTrainerProfile', () => {
  it('carga GET /auth/me', async () => {
    stubFetch(async () => jsonResponse(200, { data: ME }));
    const { result } = renderProfile();
    await waitFor(() => expect(result.current.query.data).toEqual(ME));
  });

  it('save manda PATCH /auth/me, actualiza la caché y el user', async () => {
    const updated = { ...ME, name: 'Laura G.', professional_title: 'Lic. en Educación Física' };
    const fetchMock = stubFetch(async (url, init) =>
      jsonResponse(200, { data: init.method === 'PATCH' ? updated : ME }),
    );
    const { result, queryClient } = renderProfile();
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    await act(() => result.current.save({ name: 'Laura G.', professional_title: 'Lic. en Educación Física' }));
    const patch = calls(fetchMock).find(([, init]) => init.method === 'PATCH');
    expect(patch[0]).toBe('/auth/me');
    expect(bodyOf(patch[1])).toEqual({ name: 'Laura G.', professional_title: 'Lic. en Educación Física' });
    expect(queryClient.getQueryData(ME_KEY)).toEqual(updated);
    expect(useAuthStore.getState().user).toMatchObject({
      name: 'Laura G.',
      professional_title: 'Lic. en Educación Física',
      role: 'trainer',
    });
  });
});
