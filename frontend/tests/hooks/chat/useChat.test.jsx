import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { chatTodayKey, useChatToday, useSendChat } from '@/hooks/chat/useChat';
import { errorResponse, jsonResponse } from '../../helpers/shared/fetchMock';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { STUDENT, setSession } from '../../helpers/routes/renderRoute';
import { chatDay, chatMessage, chatReply, cleanUpChat, heldReply, stubChat } from '../../helpers/chat/chat';

afterEach(() => {
  vi.useRealTimers();
  cleanUpChat();
});

const OLD = chatMessage('a-1', 'assistant', 'Respuesta anterior');
// Lo que trae el GET pedido después de guardar el par: el anterior, la consulta y la respuesta.
const SAVED = chatDay([OLD, chatMessage('a-9-question', 'user', 'Hola'), chatMessage('a-9', 'assistant', 'Probá con press con mancuernas.')], 19);

/** Un GET de /chat/today que se queda esperando hasta `release()`. */
function heldDay(data) {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  return { release, respond: () => gate.then(() => jsonResponse(200, { data })) };
}

/** El panel en un hook: la conversación del día (`now`, se cambia con `rerender`) y el envío, con el alumno adentro. */
function renderChat(now = new Date()) {
  resetAuthStore();
  setSession(STUDENT);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  const view = renderHook(({ at }) => ({ day: useChatToday(at), send: useSendChat() }), {
    wrapper,
    initialProps: { at: now },
  });
  return { ...view, queryClient };
}

const contents = (day) => day.messages.map((m) => m.content);

describe('useSendChat con el GET de /chat/today', () => {
  it('el GET vuelve antes que el POST: suma el intercambio sin volver a pedir el día', async () => {
    let gets = 0;
    stubChat({ day: () => { gets += 1; return jsonResponse(200, { data: chatDay([OLD], 20) }); } });
    const { result } = renderChat();
    await waitFor(() => expect(result.current.day.isSuccess).toBe(true));

    await act(() => result.current.send.mutateAsync({ message: 'Hola' }));
    await waitFor(() => expect(result.current.day.data.messages).toHaveLength(3));
    expect(contents(result.current.day.data)).toEqual(['Respuesta anterior', 'Hola', 'Probá con press con mancuernas.']);
    expect(result.current.day.data.remaining_today).toBe(19);
    expect(gets).toBe(1);
  });

  it('el POST vuelve antes que el GET: el GET viejo no pisa el intercambio y el día se pide de nuevo', async () => {
    const first = heldDay(chatDay([OLD], 20)); // pedido antes de guardar el par: no lo trae
    let gets = 0;
    stubChat({ day: () => { gets += 1; return gets === 1 ? first.respond() : jsonResponse(200, { data: SAVED }); } });
    const { result } = renderChat();
    await waitFor(() => expect(gets).toBe(1));

    await act(() => result.current.send.mutateAsync({ message: 'Hola' }));
    first.release();
    await waitFor(() => expect(gets).toBe(2));
    await waitFor(() => expect(result.current.day.data).toEqual(SAVED));
    expect(result.current.day.data.remaining_today).toBe(19);
  });

  it('un 429 del límite con el GET en curso deja el contador en 0', async () => {
    const first = heldDay(chatDay([OLD], 1));
    let gets = 0;
    stubChat({
      day: () => { gets += 1; return gets === 1 ? first.respond() : jsonResponse(200, { data: chatDay([OLD], 0) }); },
      send: [[429, 'CHAT_LIMIT_REACHED']],
    });
    const { result } = renderChat();
    await waitFor(() => expect(gets).toBe(1));

    await act(() => result.current.send.mutateAsync({ message: 'Hola' }).catch(() => {}));
    first.release();
    await waitFor(() => expect(gets).toBe(2));
    await waitFor(() => expect(result.current.day.data.remaining_today).toBe(0));
  });
});

describe('useSendChat pasada la medianoche de Argentina', () => {
  // Argentina es UTC-3: las 23:59:30 del 07/11 son las 02:59:30 UTC del 08/11.
  const BEFORE_MIDNIGHT = new Date('2026-11-08T02:59:30Z');
  const AFTER_MIDNIGHT = new Date('2026-11-08T03:00:30Z');

  it('la respuesta de las 23:59 va a la conversación de ayer, no a la de hoy', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(BEFORE_MIDNIGHT);
    const reply = heldReply(chatReply({ remaining_today: 0 }));
    stubChat({ day: chatDay([OLD], 1), send: [() => reply.respond()] });
    const { result, rerender, queryClient } = renderChat(BEFORE_MIDNIGHT);
    await waitFor(() => expect(result.current.day.isSuccess).toBe(true));

    let sent;
    act(() => { sent = result.current.send.mutateAsync({ message: 'Hola' }); });
    vi.setSystemTime(AFTER_MIDNIGHT);
    queryClient.setQueryData(chatTodayKey(STUDENT.id, AFTER_MIDNIGHT), chatDay([], 20)); // el día nuevo ya cargado
    rerender({ at: AFTER_MIDNIGHT }); // `useToday` cambió: el panel muestra el día nuevo
    reply.release();
    await act(() => sent);

    const yesterday = queryClient.getQueryData(chatTodayKey(STUDENT.id, BEFORE_MIDNIGHT));
    expect(contents(yesterday)).toEqual(['Respuesta anterior', 'Hola', 'Probá con press con mancuernas.']);
    expect(queryClient.getQueryData(chatTodayKey(STUDENT.id, AFTER_MIDNIGHT))).toEqual(chatDay([], 20));
  });

  it('el 429 del límite de ayer no deja en 0 el contador de hoy', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(BEFORE_MIDNIGHT);
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    stubChat({
      day: chatDay([OLD], 1),
      send: [() => gate.then(() => errorResponse(429, 'CHAT_LIMIT_REACHED'))],
    });
    const { result, rerender, queryClient } = renderChat(BEFORE_MIDNIGHT);
    await waitFor(() => expect(result.current.day.isSuccess).toBe(true));

    let sent;
    act(() => { sent = result.current.send.mutateAsync({ message: 'Hola' }).catch(() => {}); });
    vi.setSystemTime(AFTER_MIDNIGHT);
    queryClient.setQueryData(chatTodayKey(STUDENT.id, AFTER_MIDNIGHT), chatDay([], 20));
    rerender({ at: AFTER_MIDNIGHT });
    release();
    await act(() => sent);

    expect(queryClient.getQueryData(chatTodayKey(STUDENT.id, BEFORE_MIDNIGHT)).remaining_today).toBe(0);
    expect(queryClient.getQueryData(chatTodayKey(STUDENT.id, AFTER_MIDNIGHT)).remaining_today).toBe(20);
  });
});
