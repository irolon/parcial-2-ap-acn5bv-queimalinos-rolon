import { afterEach, describe, expect, it } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  chatBox, chatPosts, chatReply, cleanUpChat, renderPanel, sendButton, setOnline, stubChat,
} from '../../../helpers/chat/chat';

afterEach(cleanUpChat);

const OFFLINE = 'El asistente necesita conexión';
const UNAVAILABLE = 'El asistente no está disponible ahora. Seguí con tu entrenamiento.';

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

  it('un error de red con el navegador en línea (servidor caído): avisa, deja la consulta y se puede reintentar', async () => {
    const fetchMock = stubChat({ send: ['offline', chatReply({ response: 'Ahora sí.' })] });
    renderPanel();
    const user = userEvent.setup();
    await screen.findByText('Te quedan 20 consultas hoy');
    await user.type(chatBox(), 'Hola{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(OFFLINE);
    expect(chatBox()).toHaveValue('Hola');
    expect(chatBox()).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Ahora sí.')).toBeInTheDocument();
    expect(chatPosts(fetchMock)).toHaveLength(2);
  });

  it('se corta la conexión al enviar: sin Reintentar mientras no hay red; al volver se limpia el aviso y se puede mandar', async () => {
    const dropConnection = () => {
      setOnline(false);
      throw new TypeError('Failed to fetch');
    };
    const fetchMock = stubChat({ send: [dropConnection, chatReply({ response: 'Ahora sí.' })] });
    renderPanel();
    const user = userEvent.setup();
    await screen.findByText('Te quedan 20 consultas hoy');
    await user.type(chatBox(), 'Hola{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(OFFLINE);
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(chatBox()).toBeDisabled();
    expect(chatBox()).toHaveValue('Hola');

    act(() => setOnline(true));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(chatBox()).toBeEnabled();
    expect(chatBox()).toHaveValue('Hola');
    await user.click(sendButton());
    expect(await screen.findByText('Ahora sí.')).toBeInTheDocument();
    expect(chatPosts(fetchMock)).toHaveLength(2);
  });

  it('sin conexión desde antes de un error del asistente: avisa la falta de conexión, sin Reintentar', async () => {
    stubChat({ send: [[503, 'AI_UNAVAILABLE', UNAVAILABLE]] });
    renderPanel();
    const user = userEvent.setup();
    await screen.findByText('Te quedan 20 consultas hoy');
    await user.type(chatBox(), 'Hola{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(UNAVAILABLE);
    act(() => setOnline(false));
    expect(screen.getByRole('alert')).toHaveTextContent(OFFLINE);
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });
});
