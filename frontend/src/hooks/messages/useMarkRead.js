import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markRead } from '@/api/messages/messages.api';
import { conversationsKey, unreadKey } from './messageKeys';

/** Marca como leída la conversación; al éxito refresca el badge y la lista. `mutate()` sin argumentos. */
export function useMarkRead(studentId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markRead(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unreadKey });
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    },
  });
}
