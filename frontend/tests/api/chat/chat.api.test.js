import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHAT_TIMEOUT_MS, getChatToday, sendChat } from '@/api/chat/chat.api';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('chat.api', () => {
  it('getChatToday: GET /chat/today → { messages, remaining_today }', async () => {
    const day = { messages: [{ id: 'm-1', role: 'user', content: 'Hola', created_at: 'x' }], remaining_today: 19 };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: day }));
    expect(await getChatToday()).toEqual(day);
    expect(calls(fetchMock)[0][0]).toBe('/chat/today');
  });

  it('sendChat: POST /chat con message, session_id y current_exercise_id; devuelve data', async () => {
    const data = { message_id: 'a-1', response: 'Ok', suggestions: [], remaining_today: 18 };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    expect(await sendChat({ message: 'Hola', sessionId: 's-1', exerciseId: 'e-1' })).toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/chat');
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual({ message: 'Hola', session_id: 's-1', current_exercise_id: 'e-1' });
  });

  it('sendChat: sin sesión ni ejercicio manda solo el mensaje', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: {} }));
    await sendChat({ message: 'Hola' });
    expect(bodyOf(calls(fetchMock)[0][1])).toEqual({ message: 'Hola' });
  });

  it('sendChat: los errores del servidor llegan como ApiError con su código', async () => {
    stubFetch(async () => errorResponse(429, 'CHAT_LIMIT_REACHED'));
    await expect(sendChat({ message: 'Hola' })).rejects.toMatchObject({ status: 429, code: 'CHAT_LIMIT_REACHED' });
  });

  it(`sendChat: si no contesta en ${CHAT_TIMEOUT_MS / 1000} s corta el pedido y lo da por no disponible`, async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let signal;
    stubFetch((url, init) => {
      signal = init.signal;
      return new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    });
    const pending = sendChat({ message: 'Hola' });
    const result = expect(pending).rejects.toMatchObject({ status: 503, code: 'AI_UNAVAILABLE' });
    await vi.advanceTimersByTimeAsync(CHAT_TIMEOUT_MS);
    await result;
    expect(signal.aborted).toBe(true);
  });

  it('sendChat: si contesta a tiempo no deja el reloj corriendo', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    stubFetch(async () => jsonResponse(200, { data: {} }));
    await sendChat({ message: 'Hola' });
    expect(vi.getTimerCount()).toBe(0);
  });
});
