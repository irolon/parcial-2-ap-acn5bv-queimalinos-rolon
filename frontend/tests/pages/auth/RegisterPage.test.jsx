import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { resetAuthStore } from '../../helpers/auth/authStore';
import {
  bodyOf,
  calls,
  errorResponse,
  jsonResponse,
  stubFetch,
} from '../../helpers/shared/fetchMock';
import { STUDENT, TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';

beforeEach(() => {
  resetAuthStore();
  setSession(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const CREATED = {
  trainer: { id: 't-9', email: 'laura@fit.com', name: 'Laura Pereyra' },
  token: 'access-9',
  refresh_token: 'refresh-9',
};

async function submit({ specialty = '', password = 'Secreta123' } = {}) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Nombre y apellido'), ' Laura Pereyra ');
  await user.type(screen.getByLabelText('Email'), 'laura@fit.com');
  await user.type(screen.getByLabelText('Contraseña'), password);
  if (specialty) await user.type(screen.getByLabelText('Especialidad (opcional)'), specialty);
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
}

describe('RegisterPage', () => {
  it('muestra la regla de contraseña y el link al login', async () => {
    renderRoute('/registro');
    expect(await screen.findByLabelText('Contraseña')).toHaveAccessibleDescription(
      '8 caracteres o más, con una mayúscula y un número',
    );
    expect(screen.getByRole('link', { name: 'Ingresá' })).toHaveAttribute('href', '/login');
  });

  it('registra, guarda la sesión y va al dashboard sin enviar especialidad vacía', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(201, CREATED));
    const { pathname } = renderRoute('/registro');
    await submit();
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(pathname()).toBe('/pt/dashboard');
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/auth/register');
    expect(bodyOf(init)).toEqual({
      name: 'Laura Pereyra',
      email: 'laura@fit.com',
      password: 'Secreta123',
    });
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      token: 'access-9',
      user: { ...CREATED.trainer, role: 'trainer' },
    });
  });

  it('envía la especialidad cuando se completa', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(201, CREATED));
    renderRoute('/registro');
    await submit({ specialty: 'Hipertrofia' });
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });
    expect(bodyOf(calls(fetchMock)[0][1]).specialty).toBe('Hipertrofia');
  });

  it('EMAIL_ALREADY_EXISTS se muestra en el campo email', async () => {
    stubFetch(async () => errorResponse(409, 'EMAIL_ALREADY_EXISTS', 'Email duplicado'));
    const { pathname } = renderRoute('/registro');
    await submit();
    expect(await screen.findByLabelText('Email')).toHaveAccessibleDescription(
      'Ya existe una cuenta con ese email',
    );
    expect(pathname()).toBe('/registro');
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
  });

  it('VALIDATION_ERROR se muestra junto a cada campo', async () => {
    stubFetch(async () =>
      errorResponse(400, 'VALIDATION_ERROR', 'Error de validación', [
        { field: 'name', message: 'El nombre debe tener entre 2 y 100 caracteres' },
        { field: 'password', message: 'La contraseña debe tener una mayúscula' },
      ]),
    );
    renderRoute('/registro');
    await submit({ password: 'corta' });
    expect(await screen.findByLabelText('Nombre y apellido')).toHaveAccessibleDescription(
      'El nombre debe tener entre 2 y 100 caracteres',
    );
    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(
      'La contraseña debe tener una mayúscula 8 caracteres o más, con una mayúscula y un número',
    );
  });

  it('sin red muestra el mensaje general', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    renderRoute('/registro');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión con el servidor');
  });

  it('mientras envía el botón queda en loading', async () => {
    stubFetch(() => new Promise(() => {}));
    renderRoute('/registro');
    await submit();
    const button = screen.getByRole('button', { name: 'Crear cuenta' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it.each([
    [TRAINER, '/pt/dashboard'],
    [STUDENT, '/alumno/hoy'],
  ])('con sesión iniciada (%o) redirige a %s', async (user, target) => {
    setSession(user);
    const { pathname } = renderRoute('/registro');
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(pathname()).toBe(target);
  });

  it('desde el login se llega al registro', async () => {
    renderRoute('/login');
    await userEvent.setup().click(await screen.findByRole('link', { name: 'Registrate' }));
    expect(await screen.findByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument();
  });
});
