import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readWorkout, writeWorkout } from '@/hooks/workout/workoutStore';
import { WORKOUT_PATH } from '@/routes/routeTable';
import { mineRoutine, todayRoutine } from '../../../helpers/routines/studentRoutines';
import { cleanUpStudent, openStudent, signInStudent } from '../../../helpers/student/today';
import { finishedWorkout, freshWorkout } from '../../../helpers/workout/workout';
import { allowSlowScreens } from '../../../helpers/student/patience';

allowSlowScreens();

beforeEach(() => signInStudent());
afterEach(cleanUpStudent);

const open = (path = '/alumno/rutinas/r-1') => openStudent(path, { mine: [mineRoutine(), mineRoutine({ routine_id: 'r-2', name: 'Pierna' })] });
const OPEN_SESSION = () => freshWorkout(todayRoutine({ routine_id: 'r-2', name: 'Pierna' })); // id "session-1"

describe('RoutineDetailPage: empezar la rutina', () => {
  it('Empezar esta rutina crea la sesión con esa rutina y entra a la sesión', async () => {
    const { pathname } = open();
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Empezar esta rutina' }));
    expect(pathname()).toBe(WORKOUT_PATH);
    expect(readWorkout('s-1')).toMatchObject({ routineId: 'r-1', routineName: 'Push · día 3', finishedAt: null });
    expect(readWorkout('s-1').exercises.map((exercise) => exercise.name)).toEqual(['Press banca', 'Remo con barra']);
  });

  it('empieza la rutina que se está mirando y, sin sesión abierta, no ofrece Descartar', async () => {
    const { pathname } = open('/alumno/rutinas/r-2');
    const button = await screen.findByRole('button', { name: 'Empezar esta rutina' });
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
    await userEvent.setup().click(button);
    expect(pathname()).toBe(WORKOUT_PATH);
    expect(readWorkout('s-1')).toMatchObject({ routineId: 'r-2', routineName: 'Pierna' });
  });
});

// Review Focus 4: tocar Empezar en otra rutina con una sesión en curso no pisa la abierta.
describe('RoutineDetailPage: con una sesión en curso', () => {
  beforeEach(() => writeWorkout('s-1', OPEN_SESSION()));

  it('pasa a "Continuar la que tenés abierta" y entra a la abierta sin pisarla', async () => {
    const { pathname } = open();
    const button = await screen.findByRole('button', { name: 'Continuar la que tenés abierta' });
    expect(screen.queryByRole('button', { name: 'Empezar esta rutina' })).not.toBeInTheDocument();
    expect(screen.getByText('En curso: Pierna')).toBeInTheDocument();
    await userEvent.setup().click(button);
    expect(pathname()).toBe(WORKOUT_PATH);
    expect(readWorkout('s-1')).toMatchObject({ id: 'session-1', routineId: 'r-2', routineName: 'Pierna' });
  });

  it('ofrece descartar la abierta, con confirmación, para poder empezar esta', async () => {
    const user = userEvent.setup();
    const { pathname } = open();
    await user.click(await screen.findByRole('button', { name: 'Descartar' }));
    const dialog = await screen.findByRole('dialog', { name: '¿Descartar el entrenamiento en curso?' });
    expect(within(dialog).getByText('Se pierden las series registradas')).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(readWorkout('s-1')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sí, descartar' }));
    expect(readWorkout('s-1')).toBeNull();
    await user.click(await screen.findByRole('button', { name: 'Empezar esta rutina' }));
    expect(pathname()).toBe(WORKOUT_PATH);
    expect(readWorkout('s-1')).toMatchObject({ routineId: 'r-1', routineName: 'Push · día 3' });
    expect(readWorkout('s-1').id).not.toBe('session-1');
  });

  it('con la sesión terminada y sin guardar dice "Terminar de guardar", entra a la sesión y no ofrece Descartar', async () => {
    writeWorkout('s-1', finishedWorkout(3));
    const { pathname } = open();
    const button = await screen.findByRole('button', { name: 'Terminar de guardar' });
    expect(screen.queryByRole('button', { name: /Continuar la que tenés abierta|Empezar esta rutina/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
    await userEvent.setup().click(button);
    expect(pathname()).toBe(WORKOUT_PATH);
    expect(readWorkout('s-1')).toMatchObject({ id: 'session-1' });
  });
});
