import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getChatToday, sendChat } from '@/api/chat/chat.api';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { appendExchange, chatDayOf, keepSuggestions, withoutRemaining } from '@/utils/chat/chatDay';

export const CHAT_KEY = ['chat'];
// El día de Argentina va en la clave: con el panel abierto pasada la medianoche es otra consulta (la de ayer no sirve).
export const chatTodayKey = (studentId, now = new Date()) => [...CHAT_KEY, 'today', studentId, chatDayOf(now)];

// Cada respuesta se suma a mano a la conversación (`appendExchange`): no hace falta volver a pedirla en cada
// apertura del panel. Una recarga de la página la trae de nuevo del servidor.
const STALE_MS = 5 * 60 * 1000;

/**
 * La conversación del día del alumno con sesión iniciada (GET /chat/today). Se pide recién al abrir el panel. `now`
 * es el de `useToday` (cambia solo al pasar la medianoche): con el día nuevo se pide de nuevo. Cada pedido conserva
 * las sugerencias que ya estaban en la caché (el GET no las trae): ver `keepSuggestions`.
 */
export function useChatToday(now) {
  const studentId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const key = chatTodayKey(studentId, now);
  return useQuery({
    queryKey: key,
    queryFn: async () => keepSuggestions(await getChatToday(), queryClient.getQueryData(key)),
    enabled: Boolean(studentId),
    staleTime: STALE_MS,
  });
}

/**
 * Pone el intercambio (o el contador en 0) en la conversación del día `key`. Antes corta el GET de ese día que esté en
 * curso: si volviera después pisaría el intercambio (lo pidió antes de que se guardara). Si había uno en curso, pide
 * el día de nuevo: el servidor ya tiene el par guardado y trae la conversación completa.
 */
async function putInDay(queryClient, key, update) {
  const fetching = queryClient.isFetching({ queryKey: key, exact: true }) > 0;
  await queryClient.cancelQueries({ queryKey: key, exact: true });
  queryClient.setQueryData(key, update);
  if (fetching) queryClient.invalidateQueries({ queryKey: key, exact: true });
}

/**
 * Manda una consulta (`mutate({ message, sessionId, exerciseId, exerciseName })`; el nombre solo va a la caché).
 * Si sale bien suma el intercambio a la conversación del día; con 429 deja el contador en 0. Lo hace aunque el panel
 * ya se haya cerrado: los callbacks de `useMutation` corren igual. El error queda en `error` para el aviso (ver `chatProblem`).
 * El día se fija al mandar (`onMutate`), como hace el servidor: una respuesta que llega pasada la medianoche va a la
 * conversación de ayer, no a la de hoy.
 */
export function useSendChat() {
  const studentId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendChat,
    onMutate: () => ({ key: chatTodayKey(studentId) }),
    onSuccess: (reply, { message, exerciseId, exerciseName }, { key }) =>
      putInDay(queryClient, key, (day) => appendExchange(day, message, reply, new Date(), { exerciseId, exerciseName })),
    onError: (error, _variables, sent) => {
      if (error?.code === 'CHAT_LIMIT_REACHED' && sent) return putInDay(queryClient, sent.key, withoutRemaining);
      return undefined;
    },
  });
}
