import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import TrainerProfileCard from '@/components/account/TrainerProfileCard';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { configureClient } from '@/api/shared/client';
import { resizeToJpeg } from '@/utils/students/profile/resizeImage';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { renderWithQuery, setStoreSession } from '../../helpers/account/account';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { setupUser } from '../../helpers/shared/user';

vi.mock('@/utils/students/profile/resizeImage', async (importOriginal) => ({
  ...(await importOriginal()),
  resizeToJpeg: vi.fn(),
}));

// La foto del PT en "Tu perfil" (deseable): mismo aspecto y textos que la del alumno en Mi perfil.
const PHOTO = 'https://storage.test/avatars/trainers/t-1/a.jpg?token=1';
const NEW_PHOTO = 'https://storage.test/avatars/trainers/t-1/b.jpg?token=2';
const ME = { id: 't-1', name: 'Laura Gómez', email: 'laura@fit.com', professional_title: null, avatar_url: null };
const resized = new File(['small'], 'avatar.jpg', { type: 'image/jpeg' });
const picked = new File(['big'], 'foto.png', { type: 'image/png' });

function show({ avatar = null, upload, remove } = {}) {
  const fetchMock = stubFetch(async (url, init = {}) => {
    if (url.endsWith('/auth/me/avatar') && init.method === 'PUT') {
      return upload ? upload() : jsonResponse(200, { data: { avatar_url: NEW_PHOTO } });
    }
    if (url.endsWith('/auth/me/avatar') && init.method === 'DELETE') return remove ? remove() : jsonResponse(204);
    if (url.endsWith('/auth/me')) return jsonResponse(200, { data: { ...ME, avatar_url: avatar } });
    return errorResponse(500, 'INTERNAL');
  });
  renderWithQuery(<TrainerProfileCard />);
  return fetchMock;
}

const avatarCalls = (fetchMock) => calls(fetchMock).filter(([path]) => path === '/auth/me/avatar');
const fileInput = () => screen.getByLabelText('Elegir foto de perfil');
const photo = () => screen.getByRole('region', { name: 'Tu perfil' }).querySelector('img');

beforeEach(() => {
  resetAuthStore();
  setStoreSession({ ...ME, role: 'trainer' });
  configureClient({ getToken: () => 'access-1' });
  vi.mocked(resizeToJpeg).mockReset().mockResolvedValue(resized);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('TrainerProfileCard: foto', () => {
  it('sin foto: iniciales, "Cambiar foto" y sin "Quitar"', async () => {
    show();
    expect(await screen.findByRole('button', { name: 'Cambiar foto' })).toBeVisible();
    expect(screen.getByText('LG')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
    expect(fileInput()).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
  });

  it('elegir una foto la achica, la sube y se ve, también en el user (sidebar)', async () => {
    const user = setupUser();
    const fetchMock = show();
    await screen.findByRole('button', { name: 'Cambiar foto' });
    await user.upload(fileInput(), picked);
    await waitFor(() => expect(photo()).toHaveAttribute('src', NEW_PHOTO));
    expect(resizeToJpeg).toHaveBeenCalledWith(picked);
    const [[, init]] = avatarCalls(fetchMock);
    expect(init.method).toBe('PUT');
    expect(useAuthStore.getState().user.avatar_url).toBe(NEW_PHOTO);
    expect(fileInput()).toHaveValue('');
  });

  it('con foto: "Quitar" la borra y vuelven las iniciales', async () => {
    const user = setupUser();
    const fetchMock = show({ avatar: PHOTO });
    await waitFor(() => expect(photo()).toHaveAttribute('src', PHOTO));
    await user.click(screen.getByRole('button', { name: 'Quitar' }));
    await waitFor(() => expect(photo()).toBeNull());
    expect(avatarCalls(fetchMock)[0][1].method).toBe('DELETE');
    expect(useAuthStore.getState().user.avatar_url).toBeNull();
  });

  it.each([
    [413, 'IMAGE_TOO_LARGE', 'La foto supera 5 MB'],
    [415, 'IMAGE_TYPE_INVALID', 'Usá una foto JPG, PNG o WebP'],
    [500, 'INTERNAL', 'No pudimos subir la foto'],
  ])('un %i %s al subir muestra "%s"', async (status, code, text) => {
    const user = setupUser();
    show({ upload: () => errorResponse(status, code) });
    await screen.findByRole('button', { name: 'Cambiar foto' });
    await user.upload(fileInput(), picked);
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
  });

  it('si quitar falla, avisa y la foto queda', async () => {
    const user = setupUser();
    show({ avatar: PHOTO, remove: () => errorResponse(500, 'INTERNAL') });
    await user.click(await screen.findByRole('button', { name: 'Quitar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos quitar la foto');
    expect(photo()).toHaveAttribute('src', PHOTO);
  });
});
