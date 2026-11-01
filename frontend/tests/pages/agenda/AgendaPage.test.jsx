import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { AVAILABILITY, appt, freezeNow } from '../../helpers/agenda/fixtures';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
  freezeNow();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubAgenda({ appointments = [appt()], appointmentsError } = {}) {
  return stubFetch(async (url) => {
    const path = url.replace(/^.*\/api/, '');
    if (path.startsWith('/availability')) return jsonResponse(200, { data: AVAILABILITY });
    if (path.startsWith('/appointments')) {
      return appointmentsError ? errorResponse(500, 'INTERNAL_ERROR', 'Falló') : jsonResponse(200, { data: appointments });
    }
    return errorResponse(500, 'INTERNAL', 'Sin handler');
  });
}

function stubMedia(matches) {
  vi.stubGlobal('matchMedia', () => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
}

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const ranges = (fetchMock) =>
  calls(fetchMock)
    .map(([path]) => path)
    .filter((p) => p.startsWith('/appointments'));

describe('AgendaPage', () => {
  it('muestra el título, la semana, la grilla y los turnos', async () => {
    const fetchMock = stubAgenda();
    renderRoute('/pt/agenda');
    expect(await screen.findByRole('button', { name: 'Lucía QA, pendiente, viernes 06/11 18:00' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
    expect(screen.getByText('SEMANA DEL 2 AL 8 NOV')).toBeVisible();
    expect(screen.getByRole('grid')).toBeVisible();
    expect(screen.getByText('Mostrar cancelados')).toBeVisible();
    expect(ranges(fetchMock)).toEqual(['/appointments?from=2026-11-02&to=2026-11-08']);
  });

  it('navega entre semanas y vuelve con Hoy', async () => {
    const fetchMock = stubAgenda();
    renderRoute('/pt/agenda');
    const u = user();
    await screen.findByText('SEMANA DEL 2 AL 8 NOV');
    await u.click(screen.getByRole('button', { name: 'Semana siguiente' }));
    expect(await screen.findByText('SEMANA DEL 9 AL 15 NOV')).toBeVisible();
    await u.click(screen.getByRole('button', { name: 'Semana anterior' }));
    await u.click(screen.getByRole('button', { name: 'Semana anterior' }));
    expect(await screen.findByText('SEMANA DEL 26 OCT AL 1 NOV')).toBeVisible();
    await u.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(await screen.findByText('SEMANA DEL 2 AL 8 NOV')).toBeVisible();
    expect(ranges(fetchMock)).toContain('/appointments?from=2026-11-09&to=2026-11-15');
    expect(ranges(fetchMock)).toContain('/appointments?from=2026-10-26&to=2026-11-01');
  });

  it('oculta los cancelados hasta prender el toggle', async () => {
    stubAgenda({ appointments: [appt({ status: 'cancelled' })] });
    renderRoute('/pt/agenda');
    await screen.findByRole('grid');
    expect(screen.queryByRole('button', { name: /cancelado/ })).not.toBeInTheDocument();
    await user().click(screen.getByLabelText('Mostrar cancelados'));
    expect(screen.getByRole('button', { name: /cancelado/ })).toBeVisible();
  });

  it('al tocar un turno abre el panel', async () => {
    stubAgenda();
    renderRoute('/pt/agenda');
    await user().click(await screen.findByRole('button', { name: /Lucía QA/ }));
    expect(await screen.findByRole('dialog', { name: 'Turno' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeVisible();
  });

  it('con menos de 768 px muestra la lista por día', async () => {
    stubMedia(false);
    stubAgenda();
    renderRoute('/pt/agenda');
    expect(await screen.findByRole('region', { name: 'VIE 06' })).toBeVisible();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(screen.getAllByText('Sin turnos')).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Lucía QA, pendiente, viernes 06/11 18:00' })).toBeVisible();
  });

  it('tiene los botones Disponibilidad y Nuevo turno', async () => {
    stubAgenda();
    renderRoute('/pt/agenda');
    await screen.findByRole('grid');
    expect(screen.getByRole('button', { name: 'Disponibilidad' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Nuevo turno' })).toBeVisible();
  });

  it('si fallan los turnos muestra el error con reintento', async () => {
    stubAgenda({ appointmentsError: true });
    renderRoute('/pt/agenda');
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo salió mal');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });
});
