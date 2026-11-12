import { useInfiniteQuery } from '@tanstack/react-query';
import { getChatHistory } from '@/api/chat/chat.api';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { chatDayOf } from '@/utils/chat/chatDay';
import { CHAT_KEY } from './useChat';

// El día de Argentina va en la clave: pasada la medianoche, el de ayer pasa al historial y hay que pedirlo de nuevo.
export const chatHistoryKey = (studentId, now = new Date()) => [...CHAT_KEY, 'history', studentId, chatDayOf(now)];

/**
 * Los días anteriores del asistente (GET /chat/history), de a 7 y del más nuevo al más viejo. `fetchNextPage` trae
 * los anteriores con `before` = el `next_before` de la última página; `hasNextPage` dice si hay. `now` es el de
 * `useToday`. `days` junta los días de todas las páginas.
 */
export function useChatHistory(now) {
  const studentId = useAuthStore((state) => state.user?.id);
  const query = useInfiniteQuery({
    queryKey: chatHistoryKey(studentId, now),
    queryFn: ({ pageParam }) => getChatHistory({ before: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last?.next_before ?? undefined,
    enabled: Boolean(studentId),
  });
  return { ...query, days: query.data?.pages.flatMap((page) => page.days) ?? [] };
}
