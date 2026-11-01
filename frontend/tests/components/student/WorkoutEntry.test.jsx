import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkoutEntry from '@/components/student/WorkoutEntry';
import { readWorkout, resetWorkoutStore, writeWorkout } from '@/hooks/workout/workoutStore';
import { WORKOUT_PATH } from '@/routes/routeTable';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { STUDENT, setSession } from '../../helpers/routes/renderRoute';
import { mineRoutine, routineExercise, todayRoutine } from '../../helpers/routines/studentRoutines';
import { renderInRouter } from '../../helpers/student/render';
import { finishedWorkout, freshWorkout } from '../../helpers/workout/workout';

const START = 'Empezar entrenamiento';
const CONTINUE = 'Continuar entrenamiento';

beforeEach(() => {
  resetAuthStore();
  setSession(STUDENT);
  resetWorkoutStore();
});

const entry = (routine = todayRoutine()) => <WorkoutEntry routine={routine} startLabel={START} continueLabel={CONTINUE} />;
const stored = () => JSON.parse(localStorage.getItem('ft.workout.s-1'));

describe('WorkoutEntry: empezar', () => {
  it('sin sesión abierta empieza el entrenamiento con esa rutina y entra a la sesión', async () => {
    const { pathname } = renderInRouter(entry());
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: START }));
    expect(pathname()).toBe(WORKOUT_PATH);
    expect(stored()).toMatchObject({ routineId: 'r-1', routineName: 'Push · día 3', finishedAt: null });
    expect(stored().exercises).toHaveLength(2);
  });

  it('una rutina sin ejercicios no se puede empezar y lo explica', async () => {
    const { pathname } = renderInRouter(entry(todayRoutine({ exercises: [] })));
    expect(screen.getByRole('button', { name: START })).toBeDisabled();
    expect(screen.getByText('Esta rutina todavía no tiene ejercicios.')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: START }));
    expect(pathname()).toBe('/alumno/hoy');
    expect(localStorage.getItem('ft.workout.s-1')).toBeNull();
  });

  it('si ningún ejercicio se puede usar, avisa en vez de quedarse sin hacer nada', async () => {
    const broken = todayRoutine({ exercises: [{ ...routineExercise(), routine_exercise_id: undefined }] });
    const { pathname } = renderInRouter(entry(broken));
    await userEvent.setup().click(screen.getByRole('button', { name: START }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos empezar el entrenamiento');
    expect(pathname()).toBe('/alumno/hoy');
  });
});

// Review Focus 4: tocar Empezar en otra rutina con una sesión en curso no pisa la abierta.
describe('WorkoutEntry: con una sesión en curso', () => {
  beforeEach(() => writeWorkout('s-1', freshWorkout())); // Push · día 3 (r-1), id "session-1"

  it('en otra rutina dice Continuar, entra a la sesión abierta y no la pisa', async () => {
    const other = mineRoutine({ routine_id: 'r-2', name: 'Pierna' });
    const { pathname } = renderInRouter(entry(other));
    expect(screen.queryByRole('button', { name: START })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: CONTINUE }));
    expect(pathname()).toBe(WORKOUT_PATH);
    expect(readWorkout('s-1')).toMatchObject({ id: 'session-1', routineId: 'r-1', routineName: 'Push · día 3' });
    expect(stored()).toMatchObject({ id: 'session-1', routineId: 'r-1' });
  });

  it('dice cuál es la sesión abierta', () => {
    renderInRouter(entry(mineRoutine({ routine_id: 'r-2', name: 'Pierna' })));
    expect(screen.getByText(/En curso:/)).toHaveTextContent('En curso: Push · día 3');
  });

  it('se puede continuar aunque la rutina no traiga ejercicios', () => {
    renderInRouter(entry(todayRoutine({ exercises: [] })));
    expect(screen.getByRole('button', { name: CONTINUE })).toBeEnabled();
    expect(screen.queryByText('Esta rutina todavía no tiene ejercicios.')).not.toBeInTheDocument();
  });

  it('sin rutina (Hoy en descanso) igual deja continuar la abierta', async () => {
    const { pathname } = renderInRouter(entry(null));
    await userEvent.setup().click(screen.getByRole('button', { name: CONTINUE }));
    expect(pathname()).toBe(WORKOUT_PATH);
  });
});

describe('WorkoutEntry: descartar', () => {
  beforeEach(() => writeWorkout('s-1', freshWorkout()));

  it('pide confirmación con el texto de la spec; cancelar no borra nada', async () => {
    const user = userEvent.setup();
    renderInRouter(entry());
    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    const dialog = await screen.findByRole('dialog', { name: '¿Descartar el entrenamiento en curso?' });
    expect(within(dialog).getByText('Se pierden las series registradas')).toBeVisible();
    expect(readWorkout('s-1')).not.toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(readWorkout('s-1')).not.toBeNull();
    expect(stored().id).toBe('session-1');
  });

  it('al confirmar borra la sesión y vuelve a ofrecer Empezar', async () => {
    const user = userEvent.setup();
    renderInRouter(entry());
    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sí, descartar' }));
    expect(readWorkout('s-1')).toBeNull();
    expect(localStorage.getItem('ft.workout.s-1')).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: START })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
  });

  it('no ofrece Descartar si la sesión ya está terminada: sube o espera subir', () => {
    writeWorkout('s-1', finishedWorkout(3));
    renderInRouter(entry());
    expect(screen.getByRole('button', { name: CONTINUE })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
  });
});
