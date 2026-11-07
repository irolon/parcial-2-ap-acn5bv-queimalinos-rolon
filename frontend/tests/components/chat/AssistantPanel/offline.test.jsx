import { afterEach, describe, expect, it } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  chatBox, chatPosts, chatReply, cleanUpChat, renderPanel, sendButton, setOnline, stubChat,
} from '../../../helpers/chat/chat';

afterEach(cleanUpChat);

const OFFLINE = 'El asistente necesita conexión';

describe('AssistantPanel: sin conexión', () => {
  it('con el navegador sin conexión avisa y deshabilita la caja y los atajos', async () => {
    const fetchMock = stubChat({ day: 'offline' });
    setOnline(false);
    renderPanel();
    expect(await screen.findByText(OFFLINE)).toBeInTheDocument();
    expect(chatBox()).toBeDisabled();
    expect(sendButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: '¿Con qué lo reemplazo?' })).toBeDisabled();
    expect(chatPosts(fetchMock)).toEqual([]);
  });

  it('al volver la conexión se habilita de nuevo', async () => {
    stubChat();
    setOnline(false);
    renderPanel();
    expect(await screen.findByText(OFFLINE)).toBeInTheDocument();
    act(() => setOnline(true));
    expect(screen.queryByText(OFFLINE)).not.toBeInTheDocument();
    expect(chatBox()).toBeEnabled();
  });

  it('se corta la conexión durante la sesión: avisa al momento', async () => {
    stubChat();
    renderPanel();
    await screen.findByText('Te quedan 20 consultas hoy');
    act(() => setOnline(false));
    expect(screen.getByText(OFFLINE)).toBeInTheDocument();
    expect(chatBox()).toBeDisabled();
  });

  it('un error de red al enviar avisa lo mismo, deja la consulta en la caja y se puede reintentar', async () => {
    const fetchMock = stubChat({ send: ['offline', chatReply({ response: 'Ahora sí.' })] });
    renderPanel();
    const user = userEvent.setup();
    await screen.findByText('Te quedan 20 consultas hoy');
    await user.type(chatBox(), 'Hola{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(OFFLINE);
    expect(chatBox()).toBeDisabled();
    expect(chatBox()).toHaveValue('Hola');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Ahora sí.')).toBeInTheDocument();
    expect(chatPosts(fetchMock)).toHaveLength(2);
  });
});
