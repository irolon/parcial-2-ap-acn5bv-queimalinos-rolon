import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getChatToday, sendChat } from '@/api/chat/chat.api';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { appendExchange, chatDayOf, withoutRemaining } from '@/utils/chat/chatDay';

export const CHAT_KEY = ['chat'];
// El día de Argentina va en la clave: con el panel abierto pasada la medianoche es otra consulta (la de ayer no sirve).
export const chatTodayKey = (studentId, now = new Date()) => [...CHAT_KEY, 'today', studentId, chatDayOf(now)];

// Cada respuesta se suma a mano a la conversación (`appendExchange`): no hace falta volver a pedirla en cada
// apertura del panel. Una recarga de la página la trae de nuevo del servidor.
const STALE_MS = 5 * 60 * 1000;

/**
 * La conversación del día del alumno con sesión iniciada (GET /chat/today). Se pide recién al abrir el panel. `now`
 * es el de `useToday` (cambia solo al pasar la medianoche): con el día nuevo se pide de nuevo.
 */
export function useChatToday(now) {
  const studentId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: chatTodayKey(studentId, now),
    queryFn: getChatToday,
    enabled: Boolean(studentId),
    staleTime: STALE_MS,
  });
}

/**
 * Manda una consulta (`mutate({ message, sessionId, exerciseId })`). Si sale bien suma el intercambio a la
 * conversación del día; con 429 deja el contador en 0. Lo hace aunque el panel ya se haya cerrado: los callbacks
 * de `useMutation` corren igual. El error queda en `error` para el aviso (ver `chatProblem`).
 */
export function useSendChat(now) {
  const studentId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const key = chatTodayKey(studentId, now);
  return useMutation({
    mutationFn: sendChat,
    onSuccess: (reply, { message }) => queryClient.setQueryData(key, (day) => appendExchange(day, message, reply)),
    onError: (error) => {
      if (error?.code === 'CHAT_LIMIT_REACHED') queryClient.setQueryData(key, withoutRemaining);
    },
  });
}
