import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  chatBox, chatDay, chatMessage, chatPosts, chatReply, cleanUpChat, heldReply, renderPanel, sendButton, stubChat,
} from '../../../helpers/chat/chat';

afterEach(cleanUpChat);

const log = () => screen.getByRole('log', { name: 'Conversación con el asistente' });

describe('AssistantPanel: la conversación del día', () => {
  it('muestra sobre qué ejercicio se pregunta, la conversación de hoy y cuántas consultas quedan', async () => {
    stubChat({
      day: chatDay([chatMessage('u-1', 'user', '¿Cuántas series hago?'), chatMessage('a-1', 'assistant', 'Hacé 4.')], 18),
    });
    renderPanel();
    expect(screen.getByRole('complementary', { name: 'Asistente' })).toBeInTheDocument();
    expect(screen.getByText('Preguntando sobre: Press banca plano')).toBeInTheDocument();
    expect(await within(log()).findByText('¿Cuántas series hago?')).toBeInTheDocument();
    expect(within(log()).getByText('Hacé 4.')).toBeInTheDocument();
    expect(screen.getByText('Te quedan 18 consultas hoy')).toBeInTheDocument();
  });

  it('sin mensajes invita a preguntar; con una sola consulta lo dice en singular', async () => {
    stubChat({ day: chatDay([], 1) });
    renderPanel();
    expect(await screen.findByText('Te queda 1 consulta hoy')).toBeInTheDocument();
    expect(within(log()).getByText('Preguntale lo que necesites sobre tu entrenamiento.')).toBeInTheDocument();
  });

  it('sin ejercicio a la vista no muestra el contexto ni lo manda', async () => {
    const fetchMock = stubChat();
    renderPanel({ exercise: null });
    const user = userEvent.setup();
    await screen.findByText('Te quedan 20 consultas hoy');
    expect(screen.queryByText(/Preguntando sobre/)).not.toBeInTheDocument();
    await user.type(chatBox(), 'Hola');
    await user.click(sendButton());
    await screen.findByText('Probá con press con mancuernas.');
    expect(chatPosts(fetchMock)).toEqual([{ message: 'Hola', session_id: 'session-1' }]);
  });

  it('envía la consulta con la sesión y el ejercicio, espera "Pensando…" y suma la respuesta', async () => {
    const held = heldReply(chatReply({ remaining_today: 16 }));
    const fetchMock = stubChat({ day: chatDay([], 17), send: [held.respond] });
    renderPanel();
    const user = userEvent.setup();
    await screen.findByText('Te quedan 17 consultas hoy');
    await user.type(chatBox(), '  ¿Con qué reemplazo el press?  ');
    await user.click(sendButton());

    expect(within(log()).getByText('¿Con qué reemplazo el press?')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Pensando…' })).toBeInTheDocument();
    expect(chatBox()).toBeDisabled();
    expect(chatPosts(fetchMock)).toEqual([
      { message: '¿Con qué reemplazo el press?', session_id: 'session-1', current_exercise_id: 'e-1' },
    ]);

    held.release();
    expect(await within(log()).findByText('Probá con press con mancuernas.')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Pensando…' })).not.toBeInTheDocument();
    expect(chatBox()).toHaveValue('');
    expect(chatBox()).toBeEnabled();
    expect(screen.getByText('Te quedan 16 consultas hoy')).toBeInTheDocument();
    expect(within(log()).getAllByText('¿Con qué reemplazo el press?')).toHaveLength(1);
  });

  it('con la caja vacía no envía nada', async () => {
    const fetchMock = stubChat();
    renderPanel();
    await screen.findByText('Te quedan 20 consultas hoy');
    expect(sendButton()).toBeDisabled();
    expect(chatPosts(fetchMock)).toEqual([]);
  });

  it('Cerrar y Escape avisan para cerrar el panel', async () => {
    stubChat();
    const { onClose } = renderPanel();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Cerrar asistente' }));
    await user.click(chatBox());
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('no pide la conversación de nuevo por cada mensaje: la respuesta se suma a la que ya estaba', async () => {
    const fetchMock = stubChat({ day: chatDay([chatMessage('a-1', 'assistant', 'Hola.')]) });
    renderPanel();
    const user = userEvent.setup();
    await within(log()).findByText('Hola.');
    await user.type(chatBox(), 'Gracias{Enter}');
    await within(log()).findByText('Probá con press con mancuernas.');
    expect(within(log()).getByText('Hola.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/chat/today'))).toHaveLength(1);
  });
});
