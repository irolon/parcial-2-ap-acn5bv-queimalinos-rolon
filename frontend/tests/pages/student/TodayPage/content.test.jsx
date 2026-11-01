import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { calls } from '../../../helpers/shared/fetchMock';
import { mineRoutine, todayRoutine } from '../../../helpers/routines/studentRoutines';
import { sessionItem, sessionsPage } from '../../../helpers/sessions/sessions';
import { streakData } from '../../../helpers/student/home';
import { cleanUpStudent, openStudent, signInStudent } from '../../../helpers/student/today';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

// Hoy es domingo 1/11 (10:00 en Argentina). La semana va del lunes 26/10 a hoy.
const finished = (startedAt) => sessionItem({ started_at: startedAt, finished_at: startedAt });
const MONDAY = '2026-10-26T13:00:00Z';

beforeEach(() => signInStudent());
afterEach(cleanUpStudent);

const open = (options) => openStudent('/alumno/hoy', options);

describe('TodayPage: la rutina del día', () => {
  it('muestra el saludo, la fecha, la rutina con su resumen, el plan y la semana', async () => {
    open({
      today: todayRoutine(),
      mine: [mineRoutine()],
      sessions: sessionsPage([finished(MONDAY)]),
      streak: streakData(12),
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Hola, Tomás' })).toBeInTheDocument();
    expect(screen.getByText('Domingo 1 de noviembre')).toBeInTheDocument();
    expect(await screen.findByText('Racha 12 días')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Push · día 3' })).toBeInTheDocument();
    expect(screen.getByText('Hoy · Domingo')).toBeInTheDocument();
    expect(screen.getByText('2 EJERCICIOS · 7 SERIES · ~14 MIN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar entrenamiento' })).toBeEnabled();
    const rows = within(screen.getByRole('table', { name: 'Plan de hoy' })).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual(['01Press banca4 × 1062,5 kg', '02Remo con barra3 × 12—']);
    expect(await screen.findByText('1 de 2 entrenamientos')).toBeInTheDocument();
  });

  it('pide la rutina del día, las rutinas, el historial (primera página) y la racha del alumno', async () => {
    const { fetchMock } = open({ today: todayRoutine(), mine: [mineRoutine()] });
    await screen.findByText('0 de 2 entrenamientos');
    expect(calls(fetchMock).map(([path]) => path).sort()).toEqual([
      '/routines/mine',
      '/routines/today',
      '/students/s-1/sessions?page=1&limit=20',
      '/students/s-1/streak',
    ]);
  });
});

describe('TodayPage: la semana', () => {
  it('marca los días de las rutinas, los entrenados y hoy', async () => {
    open({ today: todayRoutine(), mine: [mineRoutine()], sessions: sessionsPage([finished(MONDAY)]) });
    expect(await screen.findByText('Lunes: entrenaste')).toBeInTheDocument();
    expect(screen.getByText('Martes: descanso')).toBeInTheDocument();
    expect(screen.getByText('Jueves: día de entrenamiento')).toBeInTheDocument();
    expect(screen.getByText('Domingo: descanso, hoy')).toBeInTheDocument();
  });

  it('junta los días de todas las rutinas activas', async () => {
    open({ mine: [mineRoutine({ days: ['monday'] }), mineRoutine({ routine_id: 'r-2', days: ['wednesday', 'friday'] })] });
    expect(await screen.findByText('0 de 3 entrenamientos')).toBeInTheDocument();
    expect(screen.getByText('Miércoles: día de entrenamiento')).toBeInTheDocument();
  });

  it('solo cuentan las sesiones terminadas de esta semana', async () => {
    const sessions = sessionsPage([
      sessionItem({ started_at: '2026-10-29T14:00:00Z', finished_at: null }), // jueves, sin terminar
      finished('2026-10-25T13:00:00Z'), // el domingo de la semana pasada
    ]);
    open({ mine: [mineRoutine()], sessions });
    expect(await screen.findByText('0 de 2 entrenamientos')).toBeInTheDocument();
  });

  it('una sesión del domingo a las 23:59 es del domingo, no del lunes (en UTC ya es lunes)', async () => {
    open({ mine: [mineRoutine()], sessions: sessionsPage([finished('2026-11-02T02:59:00Z')]) });
    expect(await screen.findByText('Domingo: entrenaste, hoy')).toBeInTheDocument();
  });
});

// Review Focus 3: un día de descanso no se confunde con un alumno sin rutina asignada.
describe('TodayPage: sin rutina del día', () => {
  it('sin ninguna rutina asignada dice que el entrenador todavía no le asignó una', async () => {
    open({ today: null, mine: [] });
    expect(await screen.findByText('Tu entrenador todavía no te asignó una rutina')).toBeInTheDocument();
    expect(screen.queryByText('Hoy es descanso')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Empezar|Continuar/ })).not.toBeInTheDocument();
    expect(await screen.findByText('Sin entrenamientos planificados')).toBeInTheDocument();
  });

  it('con rutinas pero sin una para hoy dice "Hoy es descanso" y cuál es el próximo día', async () => {
    open({ today: null, mine: [mineRoutine({ days: ['thursday', 'saturday'] })] });
    expect(await screen.findByText('Hoy es descanso')).toBeInTheDocument();
    expect(screen.getByText('Próximo: jueves')).toBeInTheDocument();
    expect(screen.queryByText('Tu entrenador todavía no te asignó una rutina')).not.toBeInTheDocument();
  });
});

describe('TodayPage: la racha', () => {
  it('sin racha no hay pastilla', async () => {
    open({ today: todayRoutine(), mine: [mineRoutine()], streak: streakData(0, 9) });
    await screen.findByRole('heading', { level: 2, name: 'Push · día 3' });
    await screen.findByText('0 de 2 entrenamientos');
    expect(screen.queryByText(/Racha/)).not.toBeInTheDocument();
  });

  it('si la racha no carga, el resto de Hoy sigue y no se muestra ningún error por ella', async () => {
    open({ today: todayRoutine(), mine: [mineRoutine()], streak: 500 });
    await screen.findByRole('heading', { level: 2, name: 'Push · día 3' });
    await screen.findByText('0 de 2 entrenamientos');
    expect(screen.queryByText(/Racha/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
