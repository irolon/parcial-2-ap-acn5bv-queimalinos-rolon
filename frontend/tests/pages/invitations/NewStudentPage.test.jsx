import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../helpers/auth/authStore';
import {
  PAGE_PATH,
  fillAndSubmit,
  invitationResponse,
  page,
  stubCanvas,
} from '../../helpers/invitations/newStudent';
import { TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import {
  bodyOf,
  calls,
  errorResponse,
  jsonResponse,
  stubFetch,
} from '../../helpers/shared/fetchMock';

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
  stubCanvas();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const created = () => jsonResponse(201, { data: invitationResponse() });

describe('NewStudentPage: formulario', () => {
  it('muestra topbar, Alumnos activo, kickers, teléfono con +54 y el estado vacío', async () => {
    renderRoute(PAGE_PATH);
    expect(await screen.findByRole('heading', { level: 1, name: 'Invitar alumno' })).toBeVisible();
    expect(
      screen.getByText('ALUMNOS › NUEVO · GENERÁ QR Y COMPARTILO POR WHATSAPP'),
    ).toBeInTheDocument();
    const sidebar = screen.getByTestId('sidebar-fixed');
    expect(within(sidebar).getByRole('link', { name: 'Alumnos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(page().getByText('DATOS DEL ALUMNO · PASO 1 DE 2')).toBeInTheDocument();
    expect(page().getByRole('heading', { name: 'PASO 2 · COMPARTIR QR' })).toBeInTheDocument();
    expect(page().getByLabelText('Teléfono')).toHaveValue('+54 ');
    expect(page().getByLabelText('Teléfono')).toHaveAccessibleDescription(
      'Con código de país, por ejemplo +54 9 11 1234 5678',
    );
    expect(page().getByLabelText('Objetivo (opcional)')).toHaveValue('');
    expect(page().getByLabelText('Nivel (opcional)')).toHaveValue('');
    expect(page().getByText('Completá los datos y generá el QR')).toBeInTheDocument();
    expect(page().queryByRole('img', { name: /Código QR/ })).not.toBeInTheDocument();
    expect(page().getByText('QUÉ VE EL ALUMNO')).toBeInTheDocument();
    expect(page().getAllByRole('listitem')).toHaveLength(4);
  });

  it('envía delivery_channel both y no manda los opcionales vacíos', async () => {
    const fetchMock = stubFetch(async () => created());
    renderRoute(PAGE_PATH);
    await fillAndSubmit({ name: ' Tomás Rivera ' });
    await page().findByRole('img', { name: /Código QR/ });
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/invitations');
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual({
      student_name: 'Tomás Rivera',
      student_email: 'tomas@fit.com',
      student_phone: '+54 9 11 1234 5678',
      delivery_channel: 'both',
    });
  });

  it('manda objetivo y nivel cuando se eligen', async () => {
    const fetchMock = stubFetch(async () => created());
    renderRoute(PAGE_PATH);
    await fillAndSubmit({ goal: 'hypertrophy', level: 'beginner' });
    await page().findByRole('img', { name: /Código QR/ });
    expect(bodyOf(calls(fetchMock)[0][1])).toMatchObject({ goal: 'hypertrophy', level: 'beginner' });
  });

  it('con el teléfono inválido muestra el error en el campo sin llamar a la API', async () => {
    const fetchMock = stubFetch(async () => created());
    renderRoute(PAGE_PATH);
    await fillAndSubmit({ phone: '1234' });
    expect(page().getByLabelText('Teléfono')).toHaveAccessibleDescription(
      /al menos 8 dígitos/,
    );
    expect(page().getByLabelText('Teléfono')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('STUDENT_EMAIL_EXISTS se muestra en el campo email', async () => {
    stubFetch(async () => errorResponse(409, 'STUDENT_EMAIL_EXISTS', 'Ya existe'));
    renderRoute(PAGE_PATH);
    await fillAndSubmit();
    expect(await page().findByLabelText('Email')).toHaveAccessibleDescription(
      'Ya existe un alumno con ese email',
    );
    expect(page().getByText('Completá los datos y generá el QR')).toBeInTheDocument();
    expect(page().getByRole('button', { name: 'Generar QR' })).toBeEnabled();
  });

  it('VALIDATION_ERROR se muestra en cada campo', async () => {
    stubFetch(async () =>
      errorResponse(400, 'VALIDATION_ERROR', 'Error de validación', [
        { field: 'student_name', message: 'El nombre debe tener entre 2 y 100 caracteres' },
        { field: 'goal', message: 'goal inválido' },
      ]),
    );
    renderRoute(PAGE_PATH);
    await fillAndSubmit({ name: 'T' });
    expect(await page().findByLabelText('Nombre y apellido')).toHaveAccessibleDescription(
      'El nombre debe tener entre 2 y 100 caracteres',
    );
    expect(page().getByLabelText('Objetivo (opcional)')).toHaveAccessibleDescription(
      'goal inválido',
    );
  });

  it('sin red muestra el mensaje general y se puede reintentar', async () => {
    let fail = true;
    const fetchMock = stubFetch(async () => {
      if (fail) throw new TypeError('Failed to fetch');
      return created();
    });
    renderRoute(PAGE_PATH);
    const user = await fillAndSubmit();
    expect(await page().findByRole('alert')).toHaveTextContent('No hay conexión con el servidor');
    fail = false;
    await user.click(page().getByRole('button', { name: 'Generar QR' }));
    expect(await page().findByRole('img', { name: /Código QR/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('el CTA "Generar QR" del sidebar lleva a la página', async () => {
    const { pathname } = renderRoute('/pt/dashboard');
    const sidebar = await screen.findByTestId('sidebar-fixed');
    await userEvent.setup().click(within(sidebar).getByRole('button', { name: 'Generar QR' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Invitar alumno' })).toBeVisible();
    expect(pathname()).toBe(PAGE_PATH);
  });
});
