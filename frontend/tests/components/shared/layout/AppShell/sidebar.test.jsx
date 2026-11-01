import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../../helpers/auth/authStore';
import { jsonResponse, stubFetch } from '../../../../helpers/shared/fetchMock';
import { stubStudents } from '../../../../helpers/students/students';
import { STUDENT, TRAINER, renderRoute, setSession } from '../../../../helpers/routes/renderRoute';

beforeEach(() => resetAuthStore());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const navOf = (container) =>
  within(container).getByRole('navigation', { name: 'Navegación principal' });
const linkNames = (nav) =>
  within(nav)
    .getAllByRole('link')
    .map((link) => link.querySelector('span').textContent);

describe('AppShell: sidebar del entrenador', () => {
  beforeEach(() => {
    setSession(TRAINER);
    stubStudents(); // el dashboard pide la lista de alumnos
  });

  it('muestra logo, subtítulo, ítems en orden y el activo con aria-current', async () => {
    renderRoute('/pt/rutinas');
    const sidebar = await screen.findByTestId('sidebar-fixed');
    expect(within(sidebar).getByText('FitTrainer')).toBeInTheDocument();
    expect(within(sidebar).getByText('PRO · LAURA')).toBeInTheDocument();
    expect(linkNames(navOf(sidebar))).toEqual([
      'Dashboard',
      'Alumnos',
      'Rutinas',
      'Biblioteca',
      'Desafíos',
      'Agenda',
      'Mensajes',
    ]);
    expect(within(sidebar).getByRole('link', { name: 'Rutinas' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(sidebar).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('tiene la tarjeta INVITAR: "Generar QR" lleva a Nuevo alumno', async () => {
    const { pathname } = renderRoute('/pt/dashboard');
    const sidebar = await screen.findByTestId('sidebar-fixed');
    expect(within(sidebar).getByText('INVITAR')).toBeInTheDocument();
    await userEvent.click(within(sidebar).getByRole('button', { name: 'Generar QR' }));
    expect(pathname()).toBe('/pt/alumnos/nuevo');
  });

  it('la topbar tiene título, subtítulo, búsqueda visual con ⌘K y campana', async () => {
    renderRoute('/pt/mensajes');
    expect(await screen.findByRole('heading', { level: 1, name: 'Mensajes' })).toBeInTheDocument();
    expect(screen.getByText('CONVERSACIONES')).toBeInTheDocument();
    expect(screen.getByTestId('topbar-search')).toHaveTextContent('Buscar…⌘K');
    expect(screen.getByRole('img', { name: 'Notificaciones' })).toBeInTheDocument();
  });

  it('"Cerrar sesión" hace logout y vuelve a /login', async () => {
    stubFetch(async () => jsonResponse(204));
    const { pathname } = renderRoute('/pt/dashboard');
    const sidebar = await screen.findByTestId('sidebar-fixed');
    await userEvent.click(within(sidebar).getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(pathname()).toBe('/login'));
  });
});

describe('AppShell: sidebar del alumno', () => {
  it('muestra ALUMNO · <nombre> y sus ítems, sin búsqueda ni INVITAR', async () => {
    setSession(STUDENT);
    renderRoute('/alumno/progreso');
    const sidebar = await screen.findByTestId('sidebar-fixed');
    expect(within(sidebar).getByText('ALUMNO · TOMÁS')).toBeInTheDocument();
    expect(linkNames(navOf(sidebar))).toEqual([
      'Hoy',
      'Mi progreso',
      'Mis rutinas',
      'Historial',
      'Mi perfil',
    ]);
    expect(within(sidebar).getByRole('link', { name: 'Mi progreso' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByTestId('topbar-search')).not.toBeInTheDocument();
    expect(screen.queryByText('INVITAR')).not.toBeInTheDocument();
  });
});
