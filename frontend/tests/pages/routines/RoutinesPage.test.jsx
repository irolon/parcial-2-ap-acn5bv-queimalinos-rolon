import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { calls } from '../../helpers/shared/fetchMock';
import { stubRoutinesApi } from '../../helpers/routines/routines';

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const main = () => within(screen.getByRole('main'));
const routine = (overrides = {}) => ({
  id: 'r-1', student_id: 'st-ana', student: { name: 'Ana Paz', active: true }, name: 'Fuerza A', goal: 'strength',
  days: ['monday', 'thursday'], active: true, ...overrides,
});

describe('RoutinesPage', () => {
  it('lista nombre, alumno con link a su ficha, días en español y estado', async () => {
    stubRoutinesApi({ routines: [routine(), routine({ id: 'r-2', name: 'Vieja', days: ['sunday'], active: false })] });
    renderRoute('/pt/rutinas');
    expect(await main().findByText('Fuerza A')).toBeVisible();
    expect(main().getAllByRole('link', { name: 'Ana Paz' })[0]).toHaveAttribute('href', '/pt/alumnos/st-ana');
    expect(main().getByText('Lunes · Jueves')).toBeVisible();
    expect(main().getByText('Activa')).toBeVisible();
    expect(main().getByText('Inactiva')).toBeVisible();
  });

  it('un alumno dado de baja se muestra con su nombre, linkeado a su ficha, y la marca', async () => {
    const student = { name: 'Beto Ruiz', active: false };
    stubRoutinesApi({ routines: [routine({ student_id: 'st-baja', student })] });
    renderRoute('/pt/rutinas');
    const link = await main().findByRole('link', { name: 'Beto Ruiz' });
    expect(link).toHaveAttribute('href', '/pt/alumnos/st-baja?estado=baja');
    expect(main().getByText('Dado de baja')).toBeVisible();
  });

  it('no pide la lista de alumnos: el alumno viene en cada rutina', async () => {
    const fetchMock = stubRoutinesApi({ routines: [routine()] });
    renderRoute('/pt/rutinas');
    expect(await main().findByText('Ana Paz')).toBeVisible();
    expect(calls(fetchMock).some(([path]) => path.startsWith('/students'))).toBe(false);
    expect(main().queryByText('…')).not.toBeInTheDocument();
  });

  it('una rutina sin alumno figura como no disponible', async () => {
    stubRoutinesApi({ routines: [routine({ student: null })] });
    renderRoute('/pt/rutinas');
    expect(await main().findByText('Alumno no disponible')).toBeVisible();
  });

  it('sin rutinas muestra el vacío con el botón para armar una', async () => {
    stubRoutinesApi();
    renderRoute('/pt/rutinas');
    expect(await main().findByText('Todavía no armaste rutinas')).toBeVisible();
    expect(main().getByRole('link', { name: 'Nueva rutina' })).toHaveAttribute('href', '/pt/rutinas/nueva');
  });

  it('"Nueva rutina" navega al editor', async () => {
    stubRoutinesApi({ routines: [routine()] });
    renderRoute('/pt/rutinas');
    await userEvent.click(await main().findByRole('link', { name: 'Nueva rutina' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Nueva rutina' })).toBeVisible();
  });

  it('si falla la carga ofrece reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'INTERNAL', message: 'Se rompió' } }), { status: 500, headers: { 'Content-Type': 'application/json' } })));
    renderRoute('/pt/rutinas');
    expect(await main().findByRole('button', { name: /reintentar/i })).toBeVisible();
  });
});
