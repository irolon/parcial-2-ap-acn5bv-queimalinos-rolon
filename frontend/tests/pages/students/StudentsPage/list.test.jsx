import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { TRAINER, renderRoute, setSession } from '../../../helpers/routes/renderRoute';
import { student } from '../../../helpers/students/fixtures';
import { daysAgo, stubStudents } from '../../../helpers/students/students';

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const main = () => within(screen.getByRole('main'));
const card = (name) => main().getByRole('link', { name: new RegExp(name) });

const load = async (path = '/pt/alumnos') => {
  stubStudents({ list: LIST() });
  const utils = renderRoute(path);
  await screen.findByRole('link', { name: /Marcos Díaz/ });
  return utils;
};

const LIST = () => [
  student({ name: 'Ana Paz', goal: 'strength', last_session_at: daysAgo(1) }),
  student({ id: 'st-marcos', name: 'Marcos Díaz', goal: null, last_session_at: daysAgo(10) }),
  student({ name: 'Nico Nuevo', created_at: daysAgo(1) }),
];

describe('StudentsPage: listado', () => {
  it('muestra cada alumno con objetivo, última sesión e insignia de estado', async () => {
    await load();
    expect(within(card('Ana Paz')).getByText('Ganar fuerza')).toBeInTheDocument();
    expect(within(card('Ana Paz')).getByText('Última sesión: Ayer')).toBeInTheDocument();
    expect(within(card('Ana Paz')).queryByText(/Inactivo|Nuevo|Al día/)).not.toBeInTheDocument();
    expect(within(card('Marcos Díaz')).getByText('Sin objetivo')).toBeInTheDocument();
    expect(within(card('Marcos Díaz')).getByText('Última sesión: Hace 10 días')).toBeInTheDocument();
    expect(within(card('Marcos Díaz')).getByText('Inactivo')).toBeInTheDocument();
    expect(card('Marcos Díaz')).toHaveClass('border-hot/40');
    expect(within(card('Nico Nuevo')).getByText('Última sesión: Nunca entrenó')).toBeInTheDocument();
    expect(within(card('Nico Nuevo')).getByText('Nuevo')).toBeInTheDocument();
  });

  it('el subtítulo de la topbar cuenta activos e inactivos', async () => {
    await load();
    expect(screen.getByRole('heading', { level: 1, name: 'Alumnos' })).toBeVisible();
    expect(await screen.findByText('3 ACTIVOS · 1 INACTIVOS')).toBeVisible();
  });

  it('la tarjeta lleva a la ficha conservando la búsqueda', async () => {
    const { router } = await load('/pt/alumnos?estado=inactivos');
    expect(card('Marcos Díaz')).toHaveAttribute('href', '/pt/alumnos/st-marcos?estado=inactivos');
    await userEvent.click(card('Marcos Díaz'));
    expect(router.state.location.pathname).toBe('/pt/alumnos/st-marcos');
    expect(router.state.location.search).toBe('?estado=inactivos');
  });

  it('el botón "Nuevo alumno" lleva a invitar', async () => {
    await load();
    await userEvent.click(main().getByRole('link', { name: 'Nuevo alumno' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Invitar alumno' })).toBeVisible();
  });

  it('sin alumnos invita a generar la primera invitación', async () => {
    stubStudents({ list: [] });
    const { pathname } = renderRoute('/pt/alumnos');
    await userEvent.click(await screen.findByRole('link', { name: 'Generá tu primera invitación' }));
    expect(pathname()).toBe('/pt/alumnos/nuevo');
  });
});
