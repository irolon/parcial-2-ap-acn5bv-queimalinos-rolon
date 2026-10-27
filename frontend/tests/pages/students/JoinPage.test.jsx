import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';

const TOKEN = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';
const INVITATION = {
  trainer: { id: 't-1', name: 'Laura Pereyra' },
  student_name: 'Tomás Ruiz',
  student_email: 'tomas@fit.com',
  goal: 'hypertrophy',
  expires_at: '2026-10-25T00:00:00Z',
};
const CREATED = {
  student: { id: 's-1', email: 'tomas@fit.com', name: 'Tomás Ruiz' },
  token: 'access-s',
  refresh_token: 'refresh-s',
};

beforeEach(() => {
  resetAuthStore();
  setSession(null);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function fill(password, confirm = password) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Contraseña'), password);
  await user.type(screen.getByLabelText('Repetí la contraseña'), confirm);
  await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
}

// GET devuelve `get`, POST devuelve `post`.
const load = ({ get, post }) =>
  stubFetch(async (url, init) => (init?.method === 'POST' ? post : get));

describe('JoinPage', () => {
  it('sin token o con token que no es UUID no llama a la API', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, INVITATION));
    const { unmount } = renderRoute('/join?token=abc');
    expect(await screen.findByText('El link de invitación no es válido')).toBeInTheDocument();
    unmount();
    renderRoute('/join');
    expect(await screen.findByText('El link de invitación no es válido')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('precarga entrenador, nombre y email', async () => {
    const fetchMock = load({ get: jsonResponse(200, INVITATION) });
    renderRoute(`/join?token=${TOKEN}`);
    expect(await screen.findByText('Laura Pereyra')).toBeInTheDocument();
    expect(screen.getByText('Tomás Ruiz')).toBeInTheDocument();
    expect(screen.getByText('tomas@fit.com')).toBeInTheDocument();
    expect(calls(fetchMock)[0][0]).toBe(`/invitations/${TOKEN}`);
  });

  it('crea la cuenta y va a /alumno/hoy con sesión de alumno', async () => {
    const fetchMock = load({ get: jsonResponse(200, INVITATION), post: jsonResponse(201, CREATED) });
    const { pathname } = renderRoute(`/join?token=${TOKEN}`);
    await fill('Secreta123');
    expect(await screen.findByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument();
    expect(pathname()).toBe('/alumno/hoy');
    expect(useAuthStore.getState().user).toMatchObject({ role: 'student', id: 's-1' });
    const post = calls(fetchMock).find(([, init]) => init?.method === 'POST');
    expect(post[0]).toBe('/students');
    expect(bodyOf(post[1])).toEqual({ token: TOKEN, password: 'Secreta123' });
  });

  it('valida que las contraseñas coincidan y tengan 8 o más', async () => {
    const fetchMock = load({ get: jsonResponse(200, INVITATION) });
    renderRoute(`/join?token=${TOKEN}`);
    await fill('Secreta123', 'Otra12345');
    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText('Contraseña'));
    await user.type(screen.getByLabelText('Contraseña'), 'corta');
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    expect(await screen.findByText('La contraseña debe tener 8 caracteres o más')).toBeInTheDocument();
    expect(calls(fetchMock).some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it.each([
    ['INVITATION_EXPIRED', 'Esta invitación venció'],
    ['INVITATION_ALREADY_USED', 'Esta invitación ya fue utilizada'],
  ])('%s al cargar pide una nueva al profe', async (code, message) => {
    load({ get: errorResponse(410, code, message) });
    renderRoute(`/join?token=${TOKEN}`);
    expect(await screen.findByText(`${message}. Pedile una nueva a tu profe`)).toBeInTheDocument();
  });

  it('no repite "Pedile una nueva" si el mensaje ya lo dice', async () => {
    const message = 'Esta invitación venció, pedile una nueva a tu profe';
    load({ get: errorResponse(410, 'INVITATION_EXPIRED', message) });
    renderRoute(`/join?token=${TOKEN}`);
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('404 muestra que la invitación no existe, sin reintentar', async () => {
    load({ get: errorResponse(404, 'INVITATION_NOT_FOUND', 'La invitación no existe') });
    renderRoute(`/join?token=${TOKEN}`);
    expect(await screen.findByText('La invitación no existe')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('un 410 al enviar reemplaza el formulario por el error', async () => {
    load({
      get: jsonResponse(200, INVITATION),
      post: errorResponse(410, 'INVITATION_ALREADY_USED', 'Esta invitación ya fue utilizada'),
    });
    renderRoute(`/join?token=${TOKEN}`);
    await fill('Secreta123');
    expect(await screen.findByText(/ya fue utilizada\. Pedile una nueva a tu profe/)).toBeInTheDocument();
  });

  it('sin red ofrece Reintentar', async () => {
    let fail = true;
    stubFetch(async () => {
      if (fail) throw new TypeError('fail');
      return jsonResponse(200, INVITATION);
    });
    renderRoute(`/join?token=${TOKEN}`);
    const retry = await screen.findByRole('button', { name: 'Reintentar' });
    fail = false;
    await userEvent.setup().click(retry);
    expect(await screen.findByText('Laura Pereyra')).toBeInTheDocument();
  });

  it('con sesión iniciada redirige a la home del rol', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, INVITATION));
    setSession(TRAINER);
    const { pathname } = renderRoute(`/join?token=${TOKEN}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(pathname()).toBe('/pt/dashboard');
    // El dashboard pide sus alumnos, pero no se consulta la invitación.
    expect(calls(fetchMock).filter(([path]) => path.includes('invitation'))).toEqual([]);
  });
});
