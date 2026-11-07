import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  chatBox, chatDay, chatMessage, chatPosts, chatReply, cleanUpChat, renderPanel, stubChat,
} from '../../../helpers/chat/chat';

afterEach(cleanUpChat);

const UNAVAILABLE = 'El asistente no está disponible ahora. Seguí con tu entrenamiento.';

async function askAndFail(failure, answers = []) {
  const fetchMock = stubChat({ send: [failure, ...answers] });
  renderPanel();
  const user = userEvent.setup();
  await screen.findByText('Te quedan 20 consultas hoy');
  await user.type(chatBox(), '¿Cómo es la técnica?{Enter}');
  return { fetchMock, user };
}

describe('AssistantPanel: cuando el asistente falla', () => {
  it('503: el mensaje amable con Reintentar y la consulta queda en la caja', async () => {
    await askAndFail([503, 'AI_UNAVAILABLE', UNAVAILABLE]);
    expect(await screen.findByRole('alert')).toHaveTextContent(UNAVAILABLE);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(chatBox()).toHaveValue('¿Cómo es la técnica?');
    expect(chatBox()).toBeEnabled();
    const log = screen.getByRole('log', { name: 'Conversación con el asistente' });
    expect(within(log).queryByText('¿Cómo es la técnica?')).not.toBeInTheDocument();
  });

  it('Reintentar vuelve a mandar la misma consulta y, si sale, se limpia el aviso', async () => {
    const { fetchMock, user } = await askAndFail([503, 'AI_UNAVAILABLE'], [chatReply({ response: 'Bajá despacio.' })]);
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Bajá despacio.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(chatBox()).toHaveValue('');
    expect(chatPosts(fetchMock).map((body) => body.message)).toEqual(['¿Cómo es la técnica?', '¿Cómo es la técnica?']);
  });

  it('502: avisa que la respuesta no se entendió, con Reintentar', async () => {
    await askAndFail([502, 'AI_INVALID_RESPONSE']);
    expect(await screen.findByRole('alert')).toHaveTextContent('El asistente respondió algo que no entendimos. Probá de nuevo.');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('un error que no conocemos se trata como "no disponible"', async () => {
    await askAndFail(500);
    expect(await screen.findByRole('alert')).toHaveTextContent(UNAVAILABLE);
  });

  it('sesión terminada (400) o ajena (404): muestra lo que dice el servidor, sin Reintentar', async () => {
    await askAndFail([400, 'SESSION_FINISHED', 'La sesión ya terminó.']);
    expect(await screen.findByRole('alert')).toHaveTextContent('La sesión ya terminó.');
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(chatBox()).toHaveValue('¿Cómo es la técnica?');
  });

  it('si no carga la conversación de hoy lo avisa con Reintentar, y se puede consultar igual', async () => {
    let calls = 0;
    stubChat({ day: () => { calls += 1; return calls === 1 ? new Response(null, { status: 500 }) : Response.json({ data: chatDay([chatMessage('a-1', 'assistant', 'Hola.')]) }); } });
    renderPanel();
    const user = userEvent.setup();
    expect(await screen.findByText('No pudimos cargar la conversación de hoy.')).toBeInTheDocument();
    expect(chatBox()).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Hola.')).toBeInTheDocument();
  });
});
