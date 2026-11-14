import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { avatarErrorMessage, useAvatar } from '@/hooks/students/useAvatar';
import { STUDENTS_KEY } from '@/hooks/students/useStudents';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { ApiError, configureClient } from '@/api/shared/client';
import { resizeToJpeg } from '@/utils/students/profile/resizeImage';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { resetAuthStore } from '../../helpers/auth/authStore';

vi.mock('@/utils/students/profile/resizeImage', async (importOriginal) => ({
  ...(await importOriginal()),
  resizeToJpeg: vi.fn(),
}));

const URL_NEW = 'https://storage.test/avatars/s-1/b.jpg?token=2';
const STUDENT = { id: 's-1', name: 'Ana', avatar_url: 'https://storage.test/a.jpg' };
const resized = new File(['small'], 'avatar.jpg', { type: 'image/jpeg' });

function renderAvatar() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  queryClient.setQueryData([...STUDENTS_KEY, 's-1'], STUDENT);
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { queryClient, ...renderHook(() => useAvatar('s-1'), { wrapper }) };
}

beforeEach(() => {
  resetAuthStore();
  useAuthStore.setState({ user: { ...STUDENT, role: 'student' }, token: 'access-1', status: 'authenticated' });
  configureClient({ getToken: () => 'access-1' });
  vi.mocked(resizeToJpeg).mockResolvedValue(resized);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useAvatar', () => {
  it('upload achica, sube y deja la URL nueva en la ficha y en el user', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: { avatar_url: URL_NEW } }));
    const { result, queryClient } = renderAvatar();
    const original = new File(['big'], 'foto.png', { type: 'image/png' });
    await act(() => result.current.upload(original));
    expect(resizeToJpeg).toHaveBeenCalledWith(original);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/students/s-1/avatar');
    expect(init.body.get('image').name).toBe('avatar.jpg');
    expect(queryClient.getQueryData([...STUDENTS_KEY, 's-1']).avatar_url).toBe(URL_NEW);
    expect(useAuthStore.getState().user.avatar_url).toBe(URL_NEW);
  });

  it('remove borra la foto y la deja en null', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(204));
    const { result, queryClient } = renderAvatar();
    await act(() => result.current.remove());
    expect(calls(fetchMock)[0][1].method).toBe('DELETE');
    expect(queryClient.getQueryData([...STUDENTS_KEY, 's-1']).avatar_url).toBeNull();
    expect(useAuthStore.getState().user.avatar_url).toBeNull();
  });

  it('un error de la subida se tira y no toca el user', async () => {
    stubFetch(async () => errorResponse(413, 'IMAGE_TOO_LARGE'));
    const { result } = renderAvatar();
    await expect(act(() => result.current.upload(resized))).rejects.toMatchObject({ status: 413 });
    expect(useAuthStore.getState().user.avatar_url).toBe(STUDENT.avatar_url);
  });
});

describe('avatarErrorMessage', () => {
  it('traduce el 413 y el tipo inválido (del backend o del achicado)', () => {
    const tooLarge = new ApiError({ status: 413, code: 'IMAGE_TOO_LARGE', message: 'x' });
    const badType = new ApiError({ status: 415, code: 'IMAGE_TYPE_INVALID', message: 'x' });
    expect(avatarErrorMessage(tooLarge, 'fallback')).toBe('La foto supera 5 MB');
    expect(avatarErrorMessage(badType, 'fallback')).toBe('Usá una foto JPG, PNG o WebP');
    expect(avatarErrorMessage(new Error('IMAGE_TYPE_INVALID'), 'fallback')).toBe('Usá una foto JPG, PNG o WebP');
  });

  it('cualquier otro error → el fallback', () => {
    expect(avatarErrorMessage(new Error('boom'), 'No pudimos subir la foto')).toBe('No pudimos subir la foto');
    expect(avatarErrorMessage(undefined, 'No pudimos subir la foto')).toBe('No pudimos subir la foto');
  });
});
