import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { useTrainerAvatar } from '@/hooks/account/useTrainerAvatar';
import { ME_KEY } from '@/hooks/account/useTrainerProfile';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { configureClient } from '@/api/shared/client';
import { resizeToJpeg } from '@/utils/students/profile/resizeImage';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { resetAuthStore } from '../../helpers/auth/authStore';

vi.mock('@/utils/students/profile/resizeImage', async (importOriginal) => ({
  ...(await importOriginal()),
  resizeToJpeg: vi.fn(),
}));

const URL_NEW = 'https://storage.test/avatars/trainers/t-1/b.jpg?token=2';
const ME = { id: 't-1', name: 'Laura', email: 'laura@fit.com', avatar_url: 'https://storage.test/a.jpg' };
const resized = new File(['small'], 'avatar.jpg', { type: 'image/jpeg' });

function renderAvatar() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  queryClient.setQueryData(ME_KEY, ME);
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { queryClient, ...renderHook(() => useTrainerAvatar(), { wrapper }) };
}

beforeEach(() => {
  resetAuthStore();
  useAuthStore.setState({ user: { ...ME, role: 'trainer' }, token: 'access-1', status: 'authenticated' });
  configureClient({ getToken: () => 'access-1' });
  vi.mocked(resizeToJpeg).mockResolvedValue(resized);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useTrainerAvatar', () => {
  it('upload achica, sube a /auth/me/avatar y deja la URL nueva en /auth/me y en el user', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: { avatar_url: URL_NEW } }));
    const { result, queryClient } = renderAvatar();
    const original = new File(['big'], 'foto.png', { type: 'image/png' });
    await act(() => result.current.upload(original));
    expect(resizeToJpeg).toHaveBeenCalledWith(original);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/auth/me/avatar');
    expect(init.method).toBe('PUT');
    expect(init.body.get('image').name).toBe('avatar.jpg');
    expect(queryClient.getQueryData(ME_KEY)).toEqual({ ...ME, avatar_url: URL_NEW });
    expect(useAuthStore.getState().user.avatar_url).toBe(URL_NEW);
  });

  it('remove borra la foto y la deja en null', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(204));
    const { result, queryClient } = renderAvatar();
    await act(() => result.current.remove());
    expect(calls(fetchMock)[0][1].method).toBe('DELETE');
    expect(queryClient.getQueryData(ME_KEY).avatar_url).toBeNull();
    expect(useAuthStore.getState().user.avatar_url).toBeNull();
  });

  it('un error de la subida se tira y no toca el user ni la caché', async () => {
    stubFetch(async () => errorResponse(415, 'IMAGE_TYPE_INVALID'));
    const { result, queryClient } = renderAvatar();
    await expect(act(() => result.current.upload(resized))).rejects.toMatchObject({ status: 415 });
    expect(useAuthStore.getState().user.avatar_url).toBe(ME.avatar_url);
    expect(queryClient.getQueryData(ME_KEY)).toEqual(ME);
  });
});
