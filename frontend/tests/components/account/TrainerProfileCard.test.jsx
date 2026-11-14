import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import TrainerProfileCard from '@/components/account/TrainerProfileCard';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { configureClient } from '@/api/shared/client';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { renderWithQuery, setStoreSession } from '../../helpers/account/account';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { setupUser } from '../../helpers/shared/user';

const ME = { id: 't-1', name: 'Laura Gómez', email: 'laura@fit.com', professional_title: null };
const TITLE = 'Lic. en Educación Física';

/** `/auth/me` guarda lo que manda el PATCH; `patch` reemplaza esa respuesta. */
function stubMe({ me = ME, patch } = {}) {
  let current = me;
  return stubFetch(async (url, init = {}) => {
    if (!url.endsWith('/auth/me')) return errorResponse(500, 'INTERNAL');
    if (init.method === 'PATCH') {
      if (patch) return patch(init);
      current = { ...current, ...bodyOf(init) };
    }
    return typeof current === 'number' ? errorResponse(current, 'INTERNAL') : jsonResponse(200, { data: current });
  });
}

const patches = (fetchMock) => calls(fetchMock).filter(([, init]) => init.method === 'PATCH');
const saveButton = () => screen.getByRole('button', { name: 'Guardar' });

beforeEach(() => {
  resetAuthStore();
  setStoreSession({ ...ME, role: 'trainer' });
  configureClient({ getToken: () => 'access-1' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('TrainerProfileCard', () => {
  it('carga nombre y título; Guardar arranca deshabilitado', async () => {
    stubMe();
    renderWithQuery(<TrainerProfileCard />);
    expect(screen.getByRole('region', { name: 'Tu perfil' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Laura Gómez');
    const title = screen.getByLabelText('Título profesional');
    expect(title).toHaveValue('');
    expect(title).toHaveAttribute('placeholder', 'Ej.: Lic. en Educación Física');
    expect(screen.getByText('Lo ven tus alumnos en su perfil')).toBeVisible();
    expect(saveButton()).toBeDisabled();
  });

  it('cargar el título lo habilita, manda solo eso y después vuelve a deshabilitarse', async () => {
    const user = setupUser();
    const fetchMock = stubMe();
    renderWithQuery(<TrainerProfileCard />);
    await user.type(await screen.findByLabelText('Título profesional'), TITLE);
    expect(saveButton()).toBeEnabled();
    await user.click(saveButton());
    await waitFor(() => expect(patches(fetchMock)).toHaveLength(1));
    expect(bodyOf(patches(fetchMock)[0][1])).toEqual({ professional_title: TITLE });
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(screen.getByLabelText('Título profesional')).toHaveValue(TITLE);
  });

  it('cambiar el nombre actualiza el user del store (el sidebar)', async () => {
    const user = setupUser();
    stubMe();
    renderWithQuery(<TrainerProfileCard />);
    const name = await screen.findByLabelText('Nombre');
    await user.clear(name);
    await user.type(name, 'Laura G.');
    await user.click(saveButton());
    await waitFor(() => expect(useAuthStore.getState().user.name).toBe('Laura G.'));
  });

  it('vaciar el título manda null', async () => {
    const user = setupUser();
    const fetchMock = stubMe({ me: { ...ME, professional_title: TITLE } });
    renderWithQuery(<TrainerProfileCard />);
    await user.clear(await screen.findByLabelText('Título profesional'));
    await user.click(saveButton());
    await waitFor(() => expect(patches(fetchMock)).toHaveLength(1));
    expect(bodyOf(patches(fetchMock)[0][1])).toEqual({ professional_title: null });
  });

  it('solo espacios no cuenta como cambio', async () => {
    const user = setupUser();
    stubMe();
    renderWithQuery(<TrainerProfileCard />);
    await user.type(await screen.findByLabelText('Nombre'), '   ');
    expect(saveButton()).toBeDisabled();
  });

  it('el 400 del backend en el título aparece junto al campo', async () => {
    const user = setupUser();
    stubMe({
      patch: () =>
        errorResponse(400, 'VALIDATION_ERROR', 'Error de validación', [
          { field: 'professional_title', message: 'professional_title debe tener entre 2 y 80 caracteres' },
        ]),
    });
    renderWithQuery(<TrainerProfileCard />);
    await user.type(await screen.findByLabelText('Título profesional'), 'L');
    await user.click(saveButton());
    expect(await screen.findByText('professional_title debe tener entre 2 y 80 caracteres')).toBeVisible();
    expect(screen.getByLabelText('Título profesional')).toHaveAttribute('aria-invalid', 'true');
  });

  it('si no carga muestra el error con Reintentar', async () => {
    stubMe({ me: 500 });
    renderWithQuery(<TrainerProfileCard />);
    expect(await screen.findByText('No pudimos cargar tu perfil.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });
});
