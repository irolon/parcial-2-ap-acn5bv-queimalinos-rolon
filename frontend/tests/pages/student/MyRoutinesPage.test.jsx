import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls } from '../../helpers/shared/fetchMock';
import { mineRoutine, routineExercise } from '../../helpers/routines/studentRoutines';
import { cleanUpStudent, openStudent, signInStudent } from '../../helpers/student/today';
import { allowSlowScreens } from '../../helpers/shared/patience';

allowSlowScreens();

const LEG_DAY = mineRoutine({
  routine_id: 'r-2',
  name: 'Pierna',
  days: ['friday', 'tuesday', 'wednesday'],
  exercises: [routineExercise(), routineExercise({ routine_exercise_id: 're-9' }), routineExercise({ routine_exercise_id: 're-8' })],
});

beforeEach(() => signInStudent());
afterEach(cleanUpStudent);

const open = (options) => openStudent('/alumno/rutinas', options);
const NEVER = () => new Promise(() => {});

describe('MyRoutinesPage', () => {
  it('lista las rutinas activas con su nombre, los días abreviados y la cantidad de ejercicios', async () => {
    const { fetchMock } = open({ mine: [mineRoutine(), LEG_DAY] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Mis rutinas' })).toBeInTheDocument();
    await screen.findByRole('link', { name: /Push · día 3/ });
    const list = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/alumno/rutinas/'));
    expect(list.map((link) => link.textContent)).toEqual([
      expect.stringMatching(/Push · día 3.*Lun · Jue.*2 ejercicios/),
      expect.stringMatching(/Pierna.*Mar · Mié · Vie.*3 ejercicios/),
    ]);
    expect(list.map((link) => link.getAttribute('href'))).toEqual(['/alumno/rutinas/r-1', '/alumno/rutinas/r-2']);
    // El h1 es el de la topbar: cada rutina es un h2.
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Push · día 3', 'Pierna']);
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/routines/mine']);
  });

  it('cada rutina lleva a su detalle', async () => {
    const { pathname } = open({ mine: [mineRoutine(), LEG_DAY] });
    await userEvent.setup().click(await screen.findByRole('link', { name: /Pierna/ }));
    expect(pathname()).toBe('/alumno/rutinas/r-2');
    expect(await screen.findByRole('heading', { level: 2, name: 'Pierna' })).toBeInTheDocument();
  });

  it('sin rutinas asignadas dice que el entrenador todavía no le asignó una', async () => {
    open({ mine: [] });
    expect(await screen.findByText('Tu entrenador todavía no te asignó una rutina')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mientras carga muestra el estado de carga', async () => {
    open({ mine: NEVER });
    expect(await screen.findByRole('status')).toHaveTextContent('Cargando tus rutinas…');
  });

  it('si falla lo dice y Reintentar las vuelve a pedir', async () => {
    let attempts = 0;
    open({ mine: () => (attempts++ === 0 ? 500 : [mineRoutine()]) });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos cargar tus rutinas.');
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('link', { name: /Push · día 3/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
