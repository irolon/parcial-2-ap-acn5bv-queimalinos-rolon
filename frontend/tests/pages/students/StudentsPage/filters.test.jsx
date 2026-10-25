import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { TRAINER, renderRoute, setSession } from '../../../helpers/routes/renderRoute';
import { calls } from '../../../helpers/shared/fetchMock';
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
const cards = () => main().queryAllByRole('link', { name: /^(?!Nuevo alumno)/ }).map((a) => a.textContent);

const LIST = () => [
  student({ name: 'Ana Paz', last_session_at: daysAgo(1) }),
  student({ name: 'Marcos Díaz', last_session_at: daysAgo(10) }),
  student({ name: 'Jose Pérez', goal: 'tonify', last_session_at: daysAgo(2) }),
];

const load = async (path, stub = {}) => {
  const fetchMock = stubStudents({ list: LIST(), ...stub });
  const utils = renderRoute(path);
  await screen.findByRole('searchbox', { name: 'Buscar alumno' });
  return { fetchMock, ...utils };
};

describe('StudentsPage: filtros', () => {
  it('lee el estado desde la URL', async () => {
    await load('/pt/alumnos?estado=inactivos');
    await screen.findByText(/Marcos Díaz/);
    expect(cards()).toHaveLength(1);
    expect(main().getByLabelText('Estado')).toHaveValue('inactivos');
  });

  it('cambiar el estado escribe la URL sin sumar historial', async () => {
    const { router } = await load('/pt/alumnos');
    await screen.findByText(/Ana Paz/);
    await userEvent.selectOptions(main().getByLabelText('Estado'), 'inactivos');
    expect(router.state.location.search).toBe('?estado=inactivos');
    expect(cards()).toHaveLength(1);
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('"Dados de baja" pide los alumnos dados de baja', async () => {
    const { fetchMock } = await load('/pt/alumnos', {
      disabled: [student({ name: 'Bruno Baja', active: false })],
    });
    await userEvent.selectOptions(main().getByLabelText('Estado'), 'baja');
    expect(await screen.findByText(/Bruno Baja/)).toBeVisible();
    expect(calls(fetchMock).map(([path]) => path)).toContain('/students?active=false&limit=100');
    expect(within(main().getByRole('link', { name: /Bruno Baja/ })).getByText('Dado de baja')).toBeVisible();
  });

  it('busca por nombre sin tener en cuenta tildes', async () => {
    await load('/pt/alumnos');
    await screen.findByText(/Ana Paz/);
    await userEvent.type(main().getByRole('searchbox', { name: 'Buscar alumno' }), 'jose perez');
    expect(cards()).toEqual([expect.stringContaining('Jose Pérez')]);
  });

  it('filtra por objetivo', async () => {
    await load('/pt/alumnos');
    await screen.findByText(/Ana Paz/);
    await userEvent.selectOptions(main().getByLabelText('Objetivo'), 'tonify');
    expect(cards()).toEqual([expect.stringContaining('Jose Pérez')]);
  });

  it('sin resultados permite limpiar los filtros', async () => {
    const { router } = await load('/pt/alumnos?q=zzz');
    expect(await screen.findByText('Ningún alumno coincide')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(router.state.location.search).toBe('');
    expect(cards()).toHaveLength(3);
  });
});
