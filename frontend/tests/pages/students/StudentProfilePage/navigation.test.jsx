import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { student, studentDetail } from '../../../helpers/students/fixtures';
import { loadProfile } from '../../../helpers/students/profile';
import { daysAgo } from '../../../helpers/students/students';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// Orden "ultima-sesion": Beto (10 días), Carla (8), Dani (2); inactivos: Beto y Carla.
const LIST = () => [
  student({ id: 'st-dani', name: 'Dani', last_session_at: daysAgo(2) }),
  student({ id: 'st-beto', name: 'Beto', last_session_at: daysAgo(10) }),
  student({ id: 'st-carla', name: 'Carla', last_session_at: daysAgo(8) }),
];

const open = async (id, name, search = '') => {
  const utils = await loadProfile({
    path: `/pt/alumnos/${id}${search}`,
    name,
    list: LIST(),
    detail: studentDetail({ id, name }),
  });
  await screen.findByText(/ de \d$/);
  return utils;
};

describe('StudentProfilePage: navegación entre alumnos', () => {
  it('muestra la posición y los links anterior y siguiente', async () => {
    await open('st-carla', 'Carla');
    expect(screen.getByText('2 de 3')).toBeVisible();
    expect(screen.getByRole('link', { name: /Anterior/ })).toHaveAttribute('href', '/pt/alumnos/st-beto');
    expect(screen.getByRole('link', { name: /Siguiente/ })).toHaveAttribute('href', '/pt/alumnos/st-dani');
  });

  it('respeta los filtros de la URL', async () => {
    await open('st-beto', 'Beto', '?estado=inactivos');
    expect(screen.getByText('1 de 2')).toBeVisible();
    expect(screen.getByRole('link', { name: /Siguiente/ })).toHaveAttribute(
      'href',
      '/pt/alumnos/st-carla?estado=inactivos',
    );
  });

  it('deshabilita anterior en el primero y siguiente en el último', async () => {
    const { unmount } = await open('st-beto', 'Beto');
    expect(screen.getByText('1 de 3')).toBeVisible();
    expect(screen.queryByRole('link', { name: /Anterior/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Anterior/)).toHaveAttribute('aria-disabled', 'true');
    unmount();
    await open('st-dani', 'Dani');
    expect(screen.getByText('3 de 3')).toBeVisible();
    expect(screen.queryByRole('link', { name: /Siguiente/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Siguiente/)).toHaveAttribute('aria-disabled', 'true');
  });

  it('ArrowRight navega al siguiente', async () => {
    const { router } = await open('st-carla', 'Carla');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(router.state.location.pathname).toBe('/pt/alumnos/st-dani');
  });

  it('ArrowLeft navega al anterior', async () => {
    const { router } = await open('st-carla', 'Carla');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(router.state.location.pathname).toBe('/pt/alumnos/st-beto');
  });

  it('con el foco en un campo, las flechas no navegan', async () => {
    const { router } = await open('st-carla', 'Carla');
    const input = document.body.appendChild(document.createElement('input'));
    fireEvent.keyDown(input, { key: 'ArrowRight' });
    expect(router.state.location.pathname).toBe('/pt/alumnos/st-carla');
    input.remove();
  });

  it('con un diálogo abierto, las flechas no navegan', async () => {
    const { router } = await open('st-carla', 'Carla');
    const dialog = document.body.appendChild(document.createElement('div'));
    dialog.setAttribute('role', 'dialog');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(router.state.location.pathname).toBe('/pt/alumnos/st-carla');
    dialog.remove();
  });
});
