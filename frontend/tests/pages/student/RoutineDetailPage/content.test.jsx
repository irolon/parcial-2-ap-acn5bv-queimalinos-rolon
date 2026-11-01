import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls } from '../../../helpers/shared/fetchMock';
import { mineRoutine, routineExercise } from '../../../helpers/routines/studentRoutines';
import { cleanUpStudent, openStudent, signInStudent } from '../../../helpers/student/today';
import { allowSlowScreens } from '../../../helpers/student/patience';

allowSlowScreens();

const NEVER = () => new Promise(() => {});
const ROUTINE = mineRoutine({
  days: ['thursday', 'monday'],
  exercises: [
    routineExercise({
      tempo: '3-1-1',
      notes: 'Pausa abajo',
      exercise: { id: 'e-1', name: 'Press banca', video_url: 'https://youtu.be/abc' },
    }),
    routineExercise({
      routine_exercise_id: 're-2',
      exercise: { id: 'e-2', name: 'Remo con barra', video_url: null },
      sets: 3,
      reps: 12,
      rest_seconds: 60,
    }),
  ],
});

beforeEach(() => signInStudent());
afterEach(cleanUpStudent);

const open = (options, path = '/alumno/rutinas/r-1') => openStudent(path, options);

describe('RoutineDetailPage', () => {
  it('muestra la rutina con sus días y sus ejercicios en orden, con todos sus datos', async () => {
    const { fetchMock } = open({ mine: [mineRoutine({ routine_id: 'r-0', name: 'Otra' }), ROUTINE] });
    expect(await screen.findByRole('heading', { level: 2, name: 'Push · día 3' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Mis rutinas' })).toBeInTheDocument();
    expect(screen.getByText('Lun · Jue · 2 ejercicios')).toBeInTheDocument();
    const items = within(screen.getByRole('list', { name: 'Ejercicios' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Press banca');
    expect(items[0]).toHaveTextContent('4 × 10 · Descanso 90 s · Tempo 3-1-1');
    expect(items[0]).toHaveTextContent('Pausa abajo');
    expect(within(items[0]).getByRole('link', { name: 'Ver video de Press banca (se abre en otra pestaña)' })).toHaveAttribute('href', 'https://youtu.be/abc');
    expect(items[1]).toHaveTextContent('Remo con barra');
    expect(items[1]).toHaveTextContent('3 × 12 · Descanso 60 s');
    expect(within(items[1]).queryByRole('link')).not.toBeInTheDocument();
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/routines/mine']);
  });

  it('el link "Volver a Mis rutinas" vuelve a la lista', async () => {
    const { pathname } = open({ mine: [ROUTINE] });
    await userEvent.setup().click(await screen.findByRole('link', { name: 'Volver a Mis rutinas' }));
    expect(pathname()).toBe('/alumno/rutinas');
    expect(await screen.findByRole('link', { name: /Push · día 3/ })).toBeInTheDocument();
  });

  it('una rutina que no está entre las activas dice "No encontramos esa rutina" y lleva a Mis rutinas', async () => {
    const { pathname } = open({ mine: [ROUTINE] }, '/alumno/rutinas/no-existe');
    expect(await screen.findByText('No encontramos esa rutina')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Empezar|Continuar/ })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('link', { name: 'Volver a Mis rutinas' }));
    expect(pathname()).toBe('/alumno/rutinas');
  });

  it('un alumno sin rutinas tampoco encuentra la rutina', async () => {
    open({ mine: [] });
    expect(await screen.findByText('No encontramos esa rutina')).toBeInTheDocument();
  });

  it('una rutina sin ejercicios lo explica y no se puede empezar', async () => {
    open({ mine: [mineRoutine({ exercises: [] })] });
    expect(await screen.findByRole('heading', { level: 2, name: 'Push · día 3' })).toBeInTheDocument();
    expect(screen.getByText('Esta rutina todavía no tiene ejercicios.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Ejercicios' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar esta rutina' })).toBeDisabled();
  });

  it('mientras carga muestra el estado de carga', async () => {
    open({ mine: NEVER });
    expect(await screen.findByRole('status')).toHaveTextContent('Cargando la rutina…');
  });

  it('si falla lo dice (no lo toma por "no encontrada") y Reintentar la vuelve a pedir', async () => {
    let attempts = 0;
    open({ mine: () => (attempts++ === 0 ? 500 : [ROUTINE]) });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos cargar la rutina.');
    expect(screen.queryByText('No encontramos esa rutina')).not.toBeInTheDocument();
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Push · día 3' })).toBeInTheDocument();
  });
});
