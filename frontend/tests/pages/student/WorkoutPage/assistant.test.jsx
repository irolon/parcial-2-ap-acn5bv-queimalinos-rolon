import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { chatDay, chatPosts, chatReply, heldReply, stubChat } from '../../../helpers/chat/chat';
import { at } from '../../../helpers/workout/workout';
import { cleanUpBrowser, registerButton, renderWorkoutPage, stored } from '../../../helpers/workout/workoutPage';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(at(10 * 60));
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanUpBrowser();
});

const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const assistantButton = () => screen.getByRole('button', { name: 'Asistente' });
const panel = () => screen.queryByRole('complementary', { name: 'Asistente' });
const chatRequests = (fetchMock) => fetchMock.mock.calls.filter(([url]) => /\/chat(\/today)?$/.test(url));

describe('WorkoutPage: el panel del asistente', () => {
  it('está cerrado al entrar y no pide nada al asistente hasta abrirlo', () => {
    const fetchMock = stubChat();
    renderWorkoutPage();
    expect(panel()).not.toBeInTheDocument();
    expect(assistantButton()).toHaveAttribute('aria-expanded', 'false');
    expect(chatRequests(fetchMock)).toHaveLength(0);
  });

  it('se abre con el ejercicio a la vista como contexto y lo sigue al cambiar de ejercicio', async () => {
    const fetchMock = stubChat();
    renderWorkoutPage();
    const user = setup();
    await user.click(assistantButton());
    expect(assistantButton()).toHaveAttribute('aria-expanded', 'true');
    expect(within(panel()).getByText('Preguntando sobre: Press banca')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(within(panel()).getByText('Preguntando sobre: Remo con barra')).toBeInTheDocument();

    await within(panel()).findByText('Te quedan 20 consultas hoy');
    await user.type(within(panel()).getByRole('textbox'), 'Hola{Enter}');
    await within(panel()).findByText('Probá con press con mancuernas.');
    expect(chatPosts(fetchMock)).toEqual([{ message: 'Hola', session_id: 'session-1', current_exercise_id: 'e-2' }]);
  });

  it('mientras el asistente piensa se registran series y corre el descanso como siempre', async () => {
    const held = heldReply(chatReply({ response: 'Usá mancuernas.' }));
    stubChat({ day: chatDay([], 20), send: [held.respond] });
    renderWorkoutPage();
    const user = setup();
    await user.click(assistantButton());
    await within(panel()).findByText('Te quedan 20 consultas hoy');
    await user.type(within(panel()).getByRole('textbox'), '¿Con qué lo reemplazo?{Enter}');
    expect(within(panel()).getByRole('status', { name: 'Pensando…' })).toBeInTheDocument();

    await user.click(registerButton());
    expect(screen.getByRole('timer')).toHaveTextContent('1:30');
    expect(stored().sets).toHaveLength(1);
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByRole('timer')).toHaveTextContent('1:00');

    held.release();
    expect(await within(panel()).findByText('Usá mancuernas.')).toBeInTheDocument();
    expect(stored().sets).toHaveLength(1);
  });

  it('cerrarlo no toca la sesión y devuelve el foco al botón; la respuesta en vuelo no se pierde', async () => {
    const held = heldReply(chatReply({ response: 'Bajá despacio.' }));
    stubChat({ send: [held.respond] });
    renderWorkoutPage();
    const user = setup();
    await user.click(registerButton());
    await user.click(assistantButton());
    await within(panel()).findByText('Te quedan 20 consultas hoy');
    await user.type(within(panel()).getByRole('textbox'), '¿Cómo es la técnica?{Enter}');
    await user.click(within(panel()).getByRole('button', { name: 'Cerrar asistente' }));

    expect(panel()).not.toBeInTheDocument();
    expect(assistantButton()).toHaveFocus();
    expect(stored().sets).toHaveLength(1);
    expect(screen.getByRole('timer')).toBeInTheDocument();

    held.release();
    await act(async () => {});
    await user.click(assistantButton());
    expect(await within(panel()).findByText('Bajá despacio.')).toBeInTheDocument();
  });

  it('con el asistente caído la sesión sigue: se registra la serie igual', async () => {
    stubChat({ send: [[503, 'AI_UNAVAILABLE']] });
    renderWorkoutPage();
    const user = setup();
    await user.click(assistantButton());
    await within(panel()).findByText('Te quedan 20 consultas hoy');
    await user.type(within(panel()).getByRole('textbox'), 'Hola{Enter}');
    expect(await within(panel()).findByRole('alert')).toHaveTextContent('El asistente no está disponible ahora.');
    await user.click(registerButton());
    expect(stored().sets).toHaveLength(1);
  });
});
