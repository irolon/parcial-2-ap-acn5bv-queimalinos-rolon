import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import MyProfilePage from '@/pages/student/MyProfilePage';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { resizeToJpeg } from '@/utils/students/profile/resizeImage';
import { calls, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../../helpers/shared/patience';
import { setupUser } from '../../../helpers/shared/user';
import { renderOwn, selfDetail, signInSelf, stubSelf } from '../../../helpers/students/self';

vi.mock('@/utils/students/profile/resizeImage', async (importOriginal) => ({
  ...(await importOriginal()),
  resizeToJpeg: vi.fn(),
}));

allowSlowScreens();

const PHOTO = 'https://storage.test/avatars/students/s-1/a.jpg?token=1';
const NEW_PHOTO = 'https://storage.test/avatars/students/s-1/b.jpg?token=2';
const resized = new File(['small'], 'avatar.jpg', { type: 'image/jpeg' });
const picked = new File(['big'], 'foto.png', { type: 'image/png' });

beforeEach(() => {
  signInSelf();
  vi.mocked(resizeToJpeg).mockReset().mockResolvedValue(resized);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** La ficha guarda la foto que sube o quita, así el refetch trae lo nuevo. */
function show({ avatar = null, uploadAvatar, removeAvatar } = {}) {
  let current = selfDetail({ avatar_url: avatar });
  const fetchMock = stubSelf({
    profile: () => current,
    uploadAvatar:
      uploadAvatar ??
      (() => {
        current = { ...current, avatar_url: NEW_PHOTO };
        return jsonResponse(200, { data: { avatar_url: NEW_PHOTO } });
      }),
    removeAvatar:
      removeAvatar ??
      (() => {
        current = { ...current, avatar_url: null };
        return jsonResponse(204);
      }),
  });
  const utils = renderOwn(<MyProfilePage />);
  return { fetchMock, ...utils };
}

const avatarCalls = (fetchMock) => calls(fetchMock).filter(([path]) => path === '/students/s-1/avatar');
const fileInput = () => screen.getByLabelText('Elegir foto de perfil');
const profilePhoto = () => screen.getByRole('heading', { level: 2 }).parentElement.querySelector('img');

describe('MyProfilePage: foto', () => {
  it('elegir una foto la achica, la sube y se ve, también en el user', async () => {
    const user = setupUser();
    const { fetchMock } = show();
    await screen.findByRole('button', { name: 'Cambiar foto' });
    expect(fileInput()).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    await user.upload(fileInput(), picked);
    await waitFor(() => expect(profilePhoto()).toHaveAttribute('src', NEW_PHOTO));
    expect(resizeToJpeg).toHaveBeenCalledWith(picked);
    const [[, init]] = avatarCalls(fetchMock);
    expect(init.method).toBe('PUT');
    expect(init.body).toBeInstanceOf(FormData);
    expect(useAuthStore.getState().user.avatar_url).toBe(NEW_PHOTO);
    expect(fileInput()).toHaveValue('');
  });

  it('un 413 dice que la foto supera 5 MB', async () => {
    const user = setupUser();
    show({ uploadAvatar: () => errorResponse(413, 'IMAGE_TOO_LARGE') });
    await screen.findByRole('button', { name: 'Cambiar foto' });
    await user.upload(fileInput(), picked);
    expect(await screen.findByRole('alert')).toHaveTextContent('La foto supera 5 MB');
  });

  it('una foto que el navegador no decodifica avisa sin pedir nada y deja reintentar', async () => {
    const user = setupUser();
    vi.mocked(resizeToJpeg).mockRejectedValue(new Error('IMAGE_TYPE_INVALID'));
    const { fetchMock } = show();
    await screen.findByRole('button', { name: 'Cambiar foto' });
    await user.upload(fileInput(), picked);
    expect(await screen.findByRole('alert')).toHaveTextContent('Usá una foto JPG, PNG o WebP');
    expect(avatarCalls(fetchMock)).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Cambiar foto' })).toBeEnabled();
  });

  it('otro error de la subida da el texto genérico', async () => {
    const user = setupUser();
    show({ uploadAvatar: () => errorResponse(500, 'INTERNAL') });
    await screen.findByRole('button', { name: 'Cambiar foto' });
    await user.upload(fileInput(), picked);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos subir la foto');
  });

  it('Quitar borra la foto y vuelven las iniciales', async () => {
    const user = setupUser();
    const { fetchMock } = show({ avatar: PHOTO });
    await user.click(await screen.findByRole('button', { name: 'Quitar' }));
    await waitFor(() => expect(profilePhoto()).toBeNull());
    expect(avatarCalls(fetchMock)[0][1].method).toBe('DELETE');
    expect(useAuthStore.getState().user.avatar_url).toBeNull();
    expect(screen.queryByRole('button', { name: 'Quitar' })).toBeNull();
  });

  it('si quitar falla lo avisa', async () => {
    const user = setupUser();
    show({ avatar: PHOTO, removeAvatar: () => errorResponse(500, 'INTERNAL') });
    await user.click(await screen.findByRole('button', { name: 'Quitar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos quitar la foto');
  });

  it('sin foto no hay Quitar', async () => {
    show();
    await screen.findByRole('button', { name: 'Cambiar foto' });
    expect(screen.queryByRole('button', { name: 'Quitar' })).toBeNull();
  });
});
