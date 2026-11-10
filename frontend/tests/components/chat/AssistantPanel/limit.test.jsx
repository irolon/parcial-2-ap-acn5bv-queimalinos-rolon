import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  chatBox, chatDay, chatPosts, cleanUpChat, renderPanel, sendButton, stubChat,
} from '../../../helpers/chat/chat';

afterEach(cleanUpChat);

const LIMIT = 'Llegaste al límite de consultas de hoy. Mañana podés seguir.';

describe('AssistantPanel: el límite del día', () => {
  it('con 0 consultas la caja y los atajos quedan deshabilitados, con el mensaje del límite', async () => {
    stubChat({ day: chatDay([], 0) });
    renderPanel();
    expect(await screen.findByText(LIMIT)).toBeInTheDocument();
    expect(screen.getByText('Te quedan 0 consultas hoy')).toBeInTheDocument();
    expect(chatBox()).toBeDisabled();
    expect(sendButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: '¿Cómo es la técnica?' })).toBeDisabled();
  });

  it('si el servidor dice que se pasó (429) muestra el límite, deja el contador en 0 y sin Reintentar', async () => {
    const fetchMock = stubChat({ day: chatDay([], 3), send: [[429, 'CHAT_LIMIT_REACHED', LIMIT]] });
    renderPanel();
    const user = userEvent.setup();
    await screen.findByText('Te quedan 3 consultas hoy');
    await user.type(chatBox(), 'Una más{Enter}');
    expect(await screen.findByText(LIMIT)).toBeInTheDocument();
    expect(screen.getByText('Te quedan 0 consultas hoy')).toBeInTheDocument();
    expect(chatBox()).toBeDisabled();
    expect(chatBox()).toHaveValue('Una más');
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(chatPosts(fetchMock)).toHaveLength(1);
  });

  it('la última consulta del día deja el contador en 0 y la caja deshabilitada', async () => {
    stubChat({ day: chatDay([], 1), send: [{ message_id: 'a-1', response: 'Listo.', suggestions: [], remaining_today: 0 }] });
    renderPanel();
    const user = userEvent.setup();
    await screen.findByText('Te queda 1 consulta hoy');
    await user.type(chatBox(), 'La última{Enter}');
    expect(await screen.findByText('Listo.')).toBeInTheDocument();
    expect(screen.getByText(LIMIT)).toBeInTheDocument();
    expect(chatBox()).toBeDisabled();
  });
});
