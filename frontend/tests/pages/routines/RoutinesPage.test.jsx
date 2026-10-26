import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { stubRoutinesApi } from '../../helpers/routines/routines';
import { student } from '../../helpers/students/fixtures';

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
  id: 'r-1', student_id: 'st-ana', name: 'Fuerza A', goal: 'strength', days: ['monday', 'thursday'], active: true, ...overrides,
});
const ana = () => student({ id: 'st-ana', name: 'Ana Paz' });

describe('RoutinesPage', () => {
  it('lista nombre, alumno con link a su ficha, días en español y estado', async () => {
    stubRoutinesApi({ routines: [routine(), routine({ id: 'r-2', name: 'Vieja', days: ['sunday'], active: false })], students: [ana()] });
    renderRoute('/pt/rutinas');
    expect(await main().findByText('Fuerza A')).toBeVisible();
    expect(main().getAllByRole('link', { name: 'Ana Paz' })[0]).toHaveAttribute('href', '/pt/alumnos/st-ana');
    expect(main().getByText('Lunes · Jueves')).toBeVisible();
    expect(main().getByText('Activa')).toBeVisible();
    expect(main().getByText('Inactiva')).toBeVisible();
  });

  it('una rutina de un alumno dado de baja lo aclara', async () => {
    stubRoutinesApi({ routines: [routine({ student_id: 'st-baja' })], students: [ana()] });
    renderRoute('/pt/rutinas');
    expect(await main().findByText('Alumno dado de baja')).toBeVisible();
  });

  it('sin rutinas muestra el vacío con el botón para armar una', async () => {
    stubRoutinesApi({ students: [ana()] });
    renderRoute('/pt/rutinas');
    expect(await main().findByText('Todavía no armaste rutinas')).toBeVisible();
    expect(main().getByRole('link', { name: 'Nueva rutina' })).toHaveAttribute('href', '/pt/rutinas/nueva');
  });

  it('"Nueva rutina" navega al editor', async () => {
    stubRoutinesApi({ routines: [routine()], students: [ana()] });
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
