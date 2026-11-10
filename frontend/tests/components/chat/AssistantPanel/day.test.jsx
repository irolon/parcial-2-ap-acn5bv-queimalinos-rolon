import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  chatBox, chatDay, chatMessage, cleanUpChat, renderPanel, stubChat,
} from '../../../helpers/chat/chat';

// Argentina es UTC-3: las 23:59:30 del 07/11 son las 02:59:30 UTC del 08/11.
const BEFORE_MIDNIGHT = new Date('2026-11-08T02:59:30Z');
const MINUTE = 60_000;
const LIMIT = 'Llegaste al límite de consultas de hoy. Mañana podés seguir.';

beforeEach(() => {
  // Solo el reloj de `useToday`: los timers de TanStack Query y de Testing Library siguen siendo reales.
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(BEFORE_MIDNIGHT);
});
afterEach(() => {
  vi.useRealTimers();
  cleanUpChat();
});

const log = () => screen.getByRole('log', { name: 'Conversación con el asistente' });

describe('AssistantPanel: el panel abierto pasada la medianoche de Argentina', () => {
  it('pide la conversación del día nuevo: se van los mensajes de ayer y vuelve el contador', async () => {
    let calls = 0;
    const yesterday = chatDay([chatMessage('u-1', 'user', 'Pregunta de ayer'), chatMessage('a-1', 'assistant', 'Respuesta de ayer')], 0);
    stubChat({ day: () => { calls += 1; return Response.json({ data: calls === 1 ? yesterday : chatDay([], 20) }); } });
    renderPanel();
    expect(await screen.findByText(LIMIT)).toBeInTheDocument();
    expect(within(log()).getByText('Respuesta de ayer')).toBeInTheDocument();
    expect(chatBox()).toBeDisabled();

    act(() => vi.advanceTimersByTime(MINUTE)); // el reloj revisa a las 00:00:30 del 08/11
    expect(await screen.findByText('Te quedan 20 consultas hoy')).toBeInTheDocument();
    expect(within(log()).queryByText('Respuesta de ayer')).not.toBeInTheDocument();
    expect(screen.queryByText(LIMIT)).not.toBeInTheDocument();
    expect(chatBox()).toBeEnabled();
    expect(calls).toBe(2);
  });

  it('un 429 del límite de ayer no deja la caja bloqueada en el día nuevo', async () => {
    stubChat({ day: chatDay([], 3), send: [[429, 'CHAT_LIMIT_REACHED', LIMIT]] });
    renderPanel();
    const user = userEvent.setup();
    await screen.findByText('Te quedan 3 consultas hoy');
    await user.type(chatBox(), 'Una más{Enter}');
    expect(await screen.findByText(LIMIT)).toBeInTheDocument();
    expect(chatBox()).toBeDisabled();

    act(() => vi.advanceTimersByTime(MINUTE));
    expect(await screen.findByText('Te quedan 3 consultas hoy')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(LIMIT)).not.toBeInTheDocument());
    expect(chatBox()).toBeEnabled();
    expect(chatBox()).toHaveValue('Una más');
  });

  it('mientras sea el mismo día no vuelve a pedirla', async () => {
    vi.setSystemTime(new Date('2026-11-07T15:00:00Z'));
    let calls = 0;
    stubChat({ day: () => { calls += 1; return Response.json({ data: chatDay([], 5) }); } });
    renderPanel();
    expect(await screen.findByText('Te quedan 5 consultas hoy')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(30 * MINUTE));
    expect(screen.getByText('Te quedan 5 consultas hoy')).toBeInTheDocument();
    expect(calls).toBe(1);
  });
});
