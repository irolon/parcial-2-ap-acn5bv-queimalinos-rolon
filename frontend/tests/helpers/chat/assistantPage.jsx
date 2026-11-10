import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import AssistantPage from '@/pages/student/AssistantPage';
import { chatDayOf } from '@/utils/chat/chatDay';
import { resetAuthStore } from '../auth/authStore';
import { STUDENT, setSession } from '../routes/renderRoute';
import { jsonResponse } from '../shared/fetchMock';
import { chatDay, stubChat } from './chat';

/** El día de Argentina de hace `daysAgo` días (aaaa-mm-dd). */
export const arDay = (daysAgo = 0) => chatDayOf(new Date(Date.now() - daysAgo * 86_400_000));

/** Un mensaje de /chat/today o /chat/history con su contexto (GX5). Hoy, con la hora de ahora. */
export const contextMessage = (id, role, content, { date = arDay(0), exercise = null, routine = null, suggestions = [] } = {}) => ({
  id,
  role,
  content,
  created_at: date === arDay(0) ? new Date().toISOString() : `${date}T15:00:00.000Z`,
  exercise,
  routine_name: routine,
  suggestions,
});

/** Una página de GET /chat/history. */
export const historyPage = (days = [], nextBefore = null) => ({ days, next_before: nextBefore });

/**
 * Backend del asistente para la página: `day` es GET /chat/today, `history` es lo de GET /chat/history (el dato o una
 * función que recibe sus `URLSearchParams`) y `send` la cola de POST /chat (ver `stubChat`).
 */
export function stubAssistant({ day = chatDay(), history = historyPage(), send } = {}) {
  return stubChat({
    day,
    send,
    other: (path) => {
      if (!path.startsWith('/chat/history')) return jsonResponse(200, { data: {} });
      const params = new URL(path, 'http://test.local').searchParams;
      return jsonResponse(200, { data: typeof history === 'function' ? history(params) : history });
    },
  });
}

/** Los GET /chat/history que salieron, como paths. */
export const historyRequests = (fetchMock) => fetchMock.mock.calls
  .map(([url]) => url)
  .filter((url) => url.includes('/chat/history'))
  .map((url) => url.slice(url.indexOf('/chat/history')));

/** Monta la página Asistente IA con el alumno adentro. */
export function renderAssistantPage() {
  resetAuthStore();
  setSession(STUDENT);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AssistantPage />
    </QueryClientProvider>,
  );
}
