import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readWorkout, writeWorkout } from '@/hooks/workout/workoutStore';
import { WORKOUT_PATH } from '@/routes/routeTable';
import { mineRoutine, todayRoutine } from '../../../helpers/routines/studentRoutines';
import { cleanUpStudent, openStudent, signInStudent } from '../../../helpers/student/today';
import { finishedWorkout, freshWorkout } from '../../../helpers/workout/workout';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

beforeEach(() => signInStudent());
afterEach(cleanUpStudent);

const open = (options) => openStudent('/alumno/hoy', options);
const OTHER_ROUTINE = todayRoutine({ routine_id: 'r-2', name: 'Pierna' });
const SESSION_OF_OTHER = () => freshWorkout(OTHER_ROUTINE); // id "session-1", Pierna (r-2)

describe('TodayPage: empezar el entrenamiento', () => {
  it('Empezar entrenamiento crea la sesión con la rutina del día y entra a la sesión', async () => {
    const { pathname } = open({ today: todayRoutine(), mine: [mineRoutine()] });
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Empezar entrenamiento' }));
    expect(pathname()).toBe(WORKOUT_PATH);
    expect(readWorkout('s-1')).toMatchObject({ routineId: 'r-1', routineName: 'Push · día 3', finishedAt: null });
    expect(JSON.parse(localStorage.getItem('ft.workout.s-1')).exercises).toHaveLength(2);
  });
});

// Review Focus 4: tocar Empezar con una sesión en curso no pisa la abierta.
describe('TodayPage: con una sesión en curso', () => {
  it('Continuar entrenamiento entra a la abierta (aunque sea de otra rutina) sin pisarla', async () => {
    writeWorkout('s-1', SESSION_OF_OTHER());
    const { pathname } = open({ today: todayRoutine(), mine: [mineRoutine()] });
    await screen.findByRole('heading', { level: 2, name: 'Push · día 3' });
    expect(screen.queryByRole('button', { name: 'Empezar entrenamiento' })).not.toBeInTheDocument();
    expect(screen.getByText('En curso: Pierna')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continuar entrenamiento' }));
    expect(pathname()).toBe(WORKOUT_PATH);
    expect(readWorkout('s-1')).toMatchObject({ id: 'session-1', routineId: 'r-2', routineName: 'Pierna' });
  });

  it('Descartar pide confirmación y, al confirmar, borra la sesión y vuelve a ofrecer Empezar', async () => {
    writeWorkout('s-1', SESSION_OF_OTHER());
    const user = userEvent.setup();
    open({ today: todayRoutine(), mine: [mineRoutine()] });
    await screen.findByRole('heading', { level: 2, name: 'Push · día 3' });
    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    const dialog = await screen.findByRole('dialog', { name: '¿Descartar el entrenamiento en curso?' });
    expect(within(dialog).getByText('Se pierden las series registradas')).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Sí, descartar' }));
    expect(readWorkout('s-1')).toBeNull();
    expect(localStorage.getItem('ft.workout.s-1')).toBeNull();
    expect(await screen.findByRole('button', { name: 'Empezar entrenamiento' })).toBeEnabled();
  });

  // Terminó de entrenar y no se guardó (sube, falló o se cortó): la pantalla de la sesión la guarda, la reintenta o la descarta.
  it('con la sesión terminada y sin guardar dice "Terminar de guardar", entra a la sesión y no ofrece Descartar', async () => {
    writeWorkout('s-1', finishedWorkout(3));
    const { pathname } = open({ today: todayRoutine(), mine: [mineRoutine()] });
    await screen.findByRole('heading', { level: 2, name: 'Push · día 3' });
    expect(screen.queryByRole('button', { name: /Continuar entrenamiento|Empezar entrenamiento/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Terminar de guardar' }));
    expect(pathname()).toBe(WORKOUT_PATH);
    expect(readWorkout('s-1')).not.toBeNull();
  });

  it('en un día de descanso la tarjeta dice que hay un entrenamiento sin guardar y deja guardarlo', async () => {
    writeWorkout('s-1', finishedWorkout(3));
    const { pathname } = open({ today: null, mine: [mineRoutine({ days: ['thursday'] })] });
    expect(await screen.findByText('Tenés un entrenamiento sin guardar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Terminar de guardar' }));
    await waitFor(() => expect(pathname()).toBe(WORKOUT_PATH));
  });

  it.each([
    ['en un día de descanso', { today: null, mine: [mineRoutine({ days: ['thursday'] })] }],
    ['sin rutinas asignadas', { today: null, mine: [] }],
    ['si la rutina del día no carga', { today: 500, mine: [mineRoutine()] }],
  ])('%s igual deja volver a la sesión abierta o descartarla', async (_, options) => {
    writeWorkout('s-1', SESSION_OF_OTHER());
    const { pathname } = open(options);
    expect(await screen.findByText('Entrenamiento en curso')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continuar entrenamiento' }));
    await waitFor(() => expect(pathname()).toBe(WORKOUT_PATH));
  });

  it('sin sesión abierta, un día de descanso no muestra ese bloque', async () => {
    open({ today: null, mine: [mineRoutine({ days: ['thursday'] })] });
    expect(await screen.findByText('Hoy es descanso')).toBeInTheDocument();
    expect(screen.queryByText('Entrenamiento en curso')).not.toBeInTheDocument();
  });
});
