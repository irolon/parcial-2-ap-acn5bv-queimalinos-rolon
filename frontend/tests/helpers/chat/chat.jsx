import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import AssistantPanel from '@/components/chat/AssistantPanel';
import { resetAuthStore } from '../auth/authStore';
import { STUDENT, setSession } from '../routes/renderRoute';
import { API_URL, errorResponse, jsonResponse, stubFetch } from '../shared/fetchMock';

export const PRESS = { exerciseId: 'e-1', name: 'Press banca plano' };

/** Un mensaje de GET /chat/today. */
export const chatMessage = (id, role, content) => ({ id, role, content, created_at: '2026-11-07T13:00:00.000Z' });

/** Lo que devuelve GET /chat/today. */
export const chatDay = (messages = [], remaining = 20) => ({ messages, remaining_today: remaining });

/** Lo que devuelve POST /chat cuando sale bien. */
export const chatReply = (overrides = {}) => ({
  message_id: 'a-9',
  response: 'Probá con press con mancuernas.',
  suggestions: [],
  remaining_today: 19,
  ...overrides,
});

/** Una respuesta que se queda esperando hasta `release()`: el asistente "pensando". */
export function heldReply(data = chatReply()) {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  return { release, respond: () => gate.then(() => jsonResponse(200, { data })) };
}

/**
 * Backend del chat falso. `day` es lo que contesta GET /chat/today (el dato, un status de error u 'offline').
 * `send` es la cola de respuestas de POST /chat, una por pedido: el dato, `[status, code]`, 'offline' o una función
 * `(init) => Response`. Con la cola vacía contesta `chatReply()`. Las demás rutas (la subida de la sesión) salen bien.
 */
export function stubChat({ day = chatDay(), send = [], other } = {}) {
  return stubFetch(async (url, init) => {
    const path = url.replace(API_URL, '');
    const answer = path === '/chat/today' ? day : path === '/chat' ? (send.shift() ?? chatReply()) : null;
    if (answer === null) return other ? other(path, init) : jsonResponse(200, { data: {} });
    if (answer === 'offline') throw new TypeError('Failed to fetch');
    if (typeof answer === 'number') return errorResponse(answer, 'INTERNAL');
    if (Array.isArray(answer)) return errorResponse(answer[0], answer[1], answer[2] ?? answer[1]);
    if (typeof answer === 'function') return answer(init);
    return jsonResponse(200, { data: answer });
  });
}

/** Los POST /chat que salieron, con su body. */
export const chatPosts = (fetchMock) => fetchMock.mock.calls
  .filter(([url, init]) => url.endsWith('/chat') && init.method === 'POST')
  .map(([, init]) => JSON.parse(init.body));

/** Monta el panel del asistente con el alumno adentro y su QueryClient. */
export function renderPanel(props = {}) {
  resetAuthStore();
  setSession(STUDENT);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <AssistantPanel exercise={PRESS} sessionId="session-1" onClose={onClose} {...props} />
    </QueryClientProvider>,
  );
  return { ...view, queryClient, onClose };
}

/** Pone el navegador con o sin conexión y avisa, como el navegador. */
export function setOnline(online) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
  window.dispatchEvent(new Event(online ? 'online' : 'offline'));
}

/** Vuelve todo a cero entre tests (también el `onlineManager` de TanStack, que escucha los eventos de conexión). */
export function cleanUpChat() {
  vi.restoreAllMocks();
  window.dispatchEvent(new Event('online'));
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetAuthStore();
}

// Los controles del panel.
export const chatBox = () => screen.getByRole('textbox', { name: 'Consulta para el asistente' });
export const sendButton = () => screen.getByRole('button', { name: 'Enviar consulta' });
