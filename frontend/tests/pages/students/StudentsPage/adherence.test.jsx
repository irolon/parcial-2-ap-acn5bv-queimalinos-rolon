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
});

const main = () => within(screen.getByRole('main'));
const cardLinks = () => main().queryAllByRole('link', { name: /^(?!Nuevo alumno)/ });
const NAMES = ['Ana Paz', 'Bruno Sosa', 'Carla Ruiz'];
const names = () => cardLinks().map((a) => NAMES.find((n) => a.textContent.includes(n)));

const LIST = () => [
  student({ name: 'Ana Paz', last_session_at: daysAgo(1), adherence_7d: { assigned: 7, done: 6, pct: 85 } }),
  student({ name: 'Bruno Sosa', last_session_at: daysAgo(2) }),
  student({ name: 'Carla Ruiz', last_session_at: daysAgo(3), adherence_7d: { assigned: 5, done: 2, pct: 40 } }),
];

const load = async (path, list = LIST()) => {
  stubStudents({ list });
  const utils = renderRoute(path);
  await screen.findByText('Ana Paz');
  return utils;
};

describe('StudentsPage: adherencia', () => {
  it('cada tarjeta muestra su barra o "Sin plan"', async () => {
    await load('/pt/alumnos');
    const meters = main().getAllByRole('meter', { name: 'Adherencia de los últimos 7 días' });
    expect(meters.map((m) => m.getAttribute('aria-valuenow')).sort()).toEqual(['40', '85']);
    expect(main().getAllByText('Sin plan', { ignore: 'option' })).toHaveLength(1);
  });

  it('el orden "Adherencia" pone primero al que menos cumple y queda en la URL', async () => {
    const { router } = await load('/pt/alumnos');
    await userEvent.selectOptions(main().getByLabelText('Orden'), 'adherencia');
    expect(router.state.location.search).toBe('?orden=adherencia');
    expect(names()).toEqual(['Carla Ruiz', 'Ana Paz', 'Bruno Sosa']);
  });

  it('el orden sobrevive a recargar (se lee de la URL)', async () => {
    await load('/pt/alumnos?orden=adherencia');
    expect(main().getByLabelText('Orden')).toHaveValue('adherencia');
    expect(names()).toEqual(['Carla Ruiz', 'Ana Paz', 'Bruno Sosa']);
  });

  it('un inactivo sigue con borde coral aunque cumpla el 100 %', async () => {
    const inactive = student({ name: 'Dani Ríos', last_session_at: daysAgo(10), adherence_7d: { assigned: 1, done: 1, pct: 100 } });
    await load('/pt/alumnos', [...LIST(), inactive]);
    const card = cardLinks().find((a) => a.textContent.includes('Dani Ríos') && within(a).queryByRole('meter'));
    expect(card).toHaveClass('border-hot/40');
    expect(within(card).getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
  });
});
