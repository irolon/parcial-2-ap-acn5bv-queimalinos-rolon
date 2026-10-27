import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../helpers/auth/authStore';
import { jsonResponse, stubFetch } from '../helpers/shared/fetchMock';
import { STUDENT, TRAINER, renderRoute, setSession } from '../helpers/routes/renderRoute';
import { stubStudents } from '../helpers/students/students';

// El dashboard del entrenador pide la lista de alumnos.
beforeEach(() => {
  resetAuthStore();
  stubStudents();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const heading = (name) => screen.findByRole('heading', { level: 1, name });

describe('guard de rutas privadas', () => {
  it('sin sesión manda a /login', async () => {
    setSession(null);
    const { pathname } = renderRoute('/pt/alumnos');
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    expect(pathname()).toBe('/login');
  });

  it('recuerda la ruta pedida y vuelve a ella después del login', async () => {
    setSession(null);
    stubFetch(async () =>
      jsonResponse(200, { user: TRAINER, token: 'a', refresh_token: 'r', expires_in: '1h' }),
    );
    const { pathname } = renderRoute('/pt/agenda');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email'), 'laura@fit.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Secreta123');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await heading('Agenda')).toBeInTheDocument();
    expect(pathname()).toBe('/pt/agenda');
  });

  it('con sesión de otro rol manda a la home de su rol', async () => {
    setSession(STUDENT);
    const { pathname } = renderRoute('/pt/dashboard');
    expect(await heading('Hoy')).toBeInTheDocument();
    expect(pathname()).toBe('/alumno/hoy');
  });

  it('con su rol deja pasar y muestra la página', async () => {
    setSession(TRAINER);
    const { pathname } = renderRoute('/pt/agenda');
    expect(await heading('Agenda')).toBeInTheDocument();
    expect(screen.getByText('Próximamente')).toBeInTheDocument();
    expect(pathname()).toBe('/pt/agenda');
  });

  it.each(['loading', 'idle'])('con status %s muestra el skeleton', async (status) => {
    setSession(TRAINER, status);
    renderRoute('/pt/dashboard');
    expect(await screen.findByRole('status')).toHaveTextContent('Verificando la sesión…');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('si la sesión expira (status anonymous) redirige a /login', async () => {
    setSession(TRAINER);
    const { pathname } = renderRoute('/pt/dashboard');
    await heading('Dashboard');
    setSession(null);
    await waitFor(() => expect(pathname()).toBe('/login'));
  });
});

describe('redirecciones por rol', () => {
  it.each([
    [TRAINER, '/pt/dashboard'],
    [STUDENT, '/alumno/hoy'],
    [null, '/login'],
  ])('/ con %o va a %s', async (user, target) => {
    setSession(user);
    const { pathname } = renderRoute('/');
    await waitFor(() => expect(pathname()).toBe(target));
  });

  it('/login con sesión iniciada va a la home del rol', async () => {
    setSession(STUDENT);
    const { pathname } = renderRoute('/login');
    await waitFor(() => expect(pathname()).toBe('/alumno/hoy'));
  });

  it('/pt sin sección va al dashboard', async () => {
    setSession(TRAINER);
    const { pathname } = renderRoute('/pt');
    await waitFor(() => expect(pathname()).toBe('/pt/dashboard'));
  });

  it('una ruta inexistente muestra el 404', async () => {
    setSession(null);
    renderRoute('/no-existe');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No encontramos esta página' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });
});
