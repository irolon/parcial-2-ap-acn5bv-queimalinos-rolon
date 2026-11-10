import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  chatBox, chatPosts, chatReply, cleanUpChat, renderPanel, sendButton, stubChat,
} from '../../../helpers/chat/chat';

afterEach(cleanUpChat);

const SHORTCUTS = ['¿Con qué lo reemplazo?', '¿Cómo es la técnica?', 'Está ocupada la máquina'];

describe('AssistantPanel: atajos y teclado', () => {
  it('cada atajo carga su texto en la caja (sin enviarlo) y deja el foco ahí', async () => {
    const fetchMock = stubChat();
    renderPanel();
    const user = userEvent.setup();
    await screen.findByText('Te quedan 20 consultas hoy');
    for (const text of SHORTCUTS) {
      await user.click(screen.getByRole('button', { name: text }));
      expect(chatBox()).toHaveValue(text);
      expect(chatBox()).toHaveFocus();
    }
    expect(chatPosts(fetchMock)).toEqual([]);
  });

  it('Enter envía y Shift+Enter hace un salto de línea', async () => {
    const fetchMock = stubChat();
    renderPanel();
    const user = userEvent.setup();
    await screen.findByText('Te quedan 20 consultas hoy');
    await user.type(chatBox(), 'Línea 1{Shift>}{Enter}{/Shift}Línea 2');
    expect(chatPosts(fetchMock)).toEqual([]);
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Probá con press con mancuernas.')).toBeInTheDocument();
    expect(chatPosts(fetchMock)[0].message).toBe('Línea 1\nLínea 2');
  });

  it('la caja acepta hasta 500 caracteres', async () => {
    stubChat();
    renderPanel();
    await screen.findByText('Te quedan 20 consultas hoy');
    expect(chatBox()).toHaveAttribute('maxLength', '500');
  });

  it('un atajo enviado sale como consulta', async () => {
    const fetchMock = stubChat({ send: [chatReply({ response: 'Usá la polea.' })] });
    renderPanel();
    const user = userEvent.setup();
    await screen.findByText('Te quedan 20 consultas hoy');
    await user.click(screen.getByRole('button', { name: 'Está ocupada la máquina' }));
    await user.click(sendButton());
    const log = screen.getByRole('log', { name: 'Conversación con el asistente' });
    expect(await within(log).findByText('Usá la polea.')).toBeInTheDocument();
    expect(chatPosts(fetchMock)[0].message).toBe('Está ocupada la máquina');
  });
});
