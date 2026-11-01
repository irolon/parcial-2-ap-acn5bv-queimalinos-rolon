import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { STUDENT, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { stubStudentHome } from '../../helpers/student/home';

beforeEach(() => {
  resetAuthStore();
  setSession(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function submit(email = 'tomas@fit.com', password = 'Secreta123') {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Contraseña'), password);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('LoginPage', () => {
  it('con credenciales incorrectas muestra el mensaje y sigue en /login', async () => {
    stubFetch(async () => errorResponse(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas'));
    const { pathname } = renderRoute('/login');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos');
    expect(pathname()).toBe('/login');
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
  });

  it('con la cuenta desactivada muestra el mensaje del backend', async () => {
    stubFetch(async () => errorResponse(403, 'ACCOUNT_DISABLED', 'Tu cuenta está desactivada'));
    renderRoute('/login');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Tu cuenta está desactivada');
  });

  it('sin red muestra "No hay conexión con el servidor"', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    renderRoute('/login');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión con el servidor');
  });

  it('con VALIDATION_ERROR muestra cada error junto a su campo', async () => {
    stubFetch(async () =>
      errorResponse(400, 'VALIDATION_ERROR', 'Error de validación', [
        { field: 'email', message: 'Email con formato inválido' },
        { field: 'password', message: 'La contraseña debe tener al menos 8 caracteres' },
      ]),
    );
    renderRoute('/login');
    await submit('mal', 'corta');
    expect(await screen.findByLabelText('Email')).toHaveAccessibleDescription(
      'Email con formato inválido',
    );
    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(
      'La contraseña debe tener al menos 8 caracteres',
    );
  });

  it('mientras envía, el botón queda en loading; al terminar va a la home del rol', async () => {
    let answer;
    // Lo único que queda colgado es el login; Hoy, al que se llega, pide la rutina, el historial y la racha.
    stubStudentHome({}, () => new Promise((resolve) => (answer = resolve)));
    renderRoute('/login');
    await submit();
    const button = screen.getByRole('button', { name: 'Ingresar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    answer(jsonResponse(200, { user: STUDENT, token: 'a', refresh_token: 'r', expires_in: '1h' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument();
  });

  it('con un rol sin home cierra la sesión y muestra el error general', async () => {
    stubFetch(async (url) =>
      url.endsWith('/auth/logout')
        ? jsonResponse(204)
        : jsonResponse(200, {
            user: { ...STUDENT, role: 'admin' },
            token: 'a',
            refresh_token: 'r',
            expires_in: '1h',
          }),
    );
    const { pathname } = renderRoute('/login');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos iniciar sesión con esa cuenta');
    expect(pathname()).toBe('/login');
    expect(useAuthStore.getState()).toMatchObject({ user: null, token: null, status: 'anonymous' });
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
  });
});
