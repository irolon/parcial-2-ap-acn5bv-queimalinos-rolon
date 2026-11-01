import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mineRoutine, todayRoutine } from '../../../helpers/routines/studentRoutines';
import { sessionItem, sessionsPage } from '../../../helpers/sessions/sessions';
import { cleanUpStudent, openStudent, signInStudent } from '../../../helpers/student/today';
import { allowSlowScreens } from '../../../helpers/student/patience';

allowSlowScreens();

const NEVER = () => new Promise(() => {});
const MONDAY = '2026-10-26T13:00:00Z';

beforeEach(() => signInStudent());
afterEach(cleanUpStudent);

const open = (options) => openStudent('/alumno/hoy', options);
// Cada bloque con error es un role="alert" propio: se busca por su mensaje.
const alertWith = async (message) => (await screen.findByText(message)).closest('[role="alert"]');
const retry = async (message) =>
  userEvent.setup().click(within(await alertWith(message)).getByRole('button', { name: 'Reintentar' }));

describe('TodayPage: la rutina del día', () => {
  it('mientras carga muestra el estado de carga y ya está el saludo', async () => {
    open({ today: NEVER, mine: [mineRoutine()] });
    expect(await screen.findByText('Cargando tu rutina de hoy…')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Hola, Tomás' })).toBeInTheDocument();
  });

  it('si falla lo dice (no lo toma por "sin rutina") y Reintentar la vuelve a pedir', async () => {
    let attempts = 0;
    open({ today: () => (attempts++ === 0 ? 500 : todayRoutine()), mine: [mineRoutine()] });
    expect(await alertWith('No pudimos cargar tu rutina de hoy.')).toBeInTheDocument();
    expect(screen.queryByText('Tu entrenador todavía no te asignó una rutina')).not.toBeInTheDocument();
    expect(screen.queryByText('Hoy es descanso')).not.toBeInTheDocument();
    await retry('No pudimos cargar tu rutina de hoy.');
    expect(await screen.findByRole('heading', { level: 2, name: 'Push · día 3' })).toBeInTheDocument();
    expect(screen.queryByText('No pudimos cargar tu rutina de hoy.')).not.toBeInTheDocument();
  });
});

describe('TodayPage: la semana', () => {
  it('mientras carga muestra su estado de carga sin frenar a la rutina del día', async () => {
    open({ today: todayRoutine(), mine: NEVER });
    expect(await screen.findByText('Cargando tu semana…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Push · día 3' })).toBeInTheDocument();
  });

  it('si falla el historial lo dice, la rutina del día sigue y Reintentar lo vuelve a pedir', async () => {
    let attempts = 0;
    const sessions = () => (attempts++ === 0 ? 500 : sessionsPage([sessionItem({ started_at: MONDAY, finished_at: MONDAY })]));
    open({ today: todayRoutine(), mine: [mineRoutine()], sessions });
    expect(await alertWith('No pudimos cargar tu semana.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Push · día 3' })).toBeInTheDocument();
    expect(screen.queryByText(/de 2 entrenamientos/)).not.toBeInTheDocument();
    await retry('No pudimos cargar tu semana.');
    expect(await screen.findByText('1 de 2 entrenamientos')).toBeInTheDocument();
    expect(screen.queryByText('No pudimos cargar tu semana.')).not.toBeInTheDocument();
  });

  it('si fallan las rutinas activas, la semana y el descanso lo dicen y un Reintentar arregla los dos', async () => {
    let attempts = 0;
    open({ today: null, mine: () => (attempts++ === 0 ? 500 : [mineRoutine({ days: ['thursday'] })]) });
    expect(await alertWith('No pudimos cargar tus rutinas.')).toBeInTheDocument();
    expect(await alertWith('No pudimos cargar tu semana.')).toBeInTheDocument();
    await retry('No pudimos cargar tu semana.');
    expect(await screen.findByText('Hoy es descanso')).toBeInTheDocument();
    expect(screen.getByText('Próximo: jueves')).toBeInTheDocument();
    expect(await screen.findByText('0 de 1 entrenamiento')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
