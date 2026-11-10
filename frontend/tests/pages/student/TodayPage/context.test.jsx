import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appt } from '../../../helpers/agenda/fixtures';
import { mineRoutine, todayRoutine } from '../../../helpers/routines/studentRoutines';
import { calls } from '../../../helpers/shared/fetchMock';
import { sessionItem, sessionsPage } from '../../../helpers/sessions/sessions';
import { cleanUpStudent, openStudent, signInStudent } from '../../../helpers/student/today';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

// Hoy es domingo 1/11 (10:00 en Argentina): los turnos se piden del 01/11 al 14/11.
const MONDAY = '2026-10-26T13:00:00Z';
const THURSDAY_18 = '2026-11-05T21:00:00.000Z';
const commented = (comment, overrides) =>
  sessionItem({ started_at: MONDAY, finished_at: MONDAY, trainer_comment: comment, ...overrides });

beforeEach(() => signInStudent());
afterEach(cleanUpStudent);

const open = (options) => openStudent('/alumno/hoy', { today: todayRoutine(), mine: [mineRoutine()], ...options });
const cardOf = async (title) => (await screen.findByText(title)).closest('.rounded-xl');

describe('TodayPage: la nota del entrenador/a', () => {
  it('muestra "Nota de Laura" con el último comentario, la fecha de la sesión y la rutina', async () => {
    open({ sessions: sessionsPage([commented('Subí 2,5 kg en press la próxima')]) });
    const card = await cardOf('Nota de Laura');
    expect(within(card).getByText('Subí 2,5 kg en press la próxima')).toHaveAttribute(
      'title',
      'Subí 2,5 kg en press la próxima',
    );
    expect(within(card).getByText('Sobre tu sesión del 26/10 · Push · día 3')).toBeInTheDocument();
  });

  it('sin rutina en la sesión, la fecha sola', async () => {
    open({ sessions: sessionsPage([commented('Bien ahí', { routine: null })]) });
    expect(await screen.findByText('Sobre tu sesión del 26/10')).toBeInTheDocument();
  });

  it('sin comentarios muestra el vacío', async () => {
    open({ sessions: sessionsPage([commented(null)]) });
    expect(await screen.findByText('Tu entrenador/a todavía no comentó tus sesiones.')).toBeInTheDocument();
  });

  it('si no se sabe quién es el entrenador/a, el título es genérico', async () => {
    open({ sessions: sessionsPage([commented('Dale')]), counterpart: 500 });
    expect(await screen.findByText('Nota de tu entrenador/a')).toBeInTheDocument();
    expect(screen.getByText('Dale')).toBeInTheDocument();
  });

  it('si falla el historial no suma un error: lo dice solo "Esta semana"', async () => {
    open({ sessions: 500 });
    expect(await screen.findByText('No pudimos cargar tu semana.')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});

describe('TodayPage: el próximo turno', () => {
  it('pide los turnos de hoy a hoy + 13 y muestra el confirmado con día, hora y estado', async () => {
    const { fetchMock } = open({ appointments: [appt({ scheduled_at: THURSDAY_18, status: 'confirmed' })] });
    const card = await cardOf('Próximo turno');
    expect(await within(card).findByText('Jueves 05/11 · 18:00')).toBeInTheDocument();
    expect(within(card).getByText('Confirmado')).toBeInTheDocument();
    expect(calls(fetchMock).map(([path]) => path)).toContain('/appointments?from=2026-11-01&to=2026-11-14');
  });

  it('sin turnos muestra el vacío', async () => {
    open({ appointments: [appt({ scheduled_at: THURSDAY_18, status: 'cancelled' })] });
    expect(await screen.findByText('No tenés turnos en los próximos 14 días.')).toBeInTheDocument();
  });

  it('si fallan los turnos lo dice, la rutina del día sigue y Reintentar los vuelve a pedir', async () => {
    let attempts = 0;
    open({ appointments: () => (attempts++ === 0 ? 500 : [appt({ scheduled_at: THURSDAY_18 })]) });
    const alert = (await screen.findByText('No pudimos cargar tus turnos.')).closest('[role="alert"]');
    expect(screen.getByRole('heading', { level: 2, name: 'Push · día 3' })).toBeInTheDocument();
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Jueves 05/11 · 18:00')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });
});

describe('TodayPage: la columna de contexto', () => {
  it('va en orden (semana, nota, turno) y el botón de la rutina sigue antes que todo eso', async () => {
    open({ sessions: sessionsPage([commented('Dale')]) });
    const start = await screen.findByRole('button', { name: 'Empezar entrenamiento' });
    const titles = await Promise.all(['Esta semana', 'Nota de Laura', 'Próximo turno'].map((t) => screen.findByText(t)));
    const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(start, titles[0])).toBe(true);
    expect(follows(titles[0], titles[1])).toBe(true);
    expect(follows(titles[1], titles[2])).toBe(true);
    const buttons = screen.getAllByRole('button').filter((button) => follows(button, titles[0]));
    expect(buttons.map((button) => button.textContent)).not.toContain('Reintentar');
  });
});
