import { useMutation, useQueryClient } from '@tanstack/react-query';
import { broadcast } from '@/api/messages/messages.api';
import { MESSAGES_KEY } from './messageKeys';

/** Envío masivo de texto. `mutate({ studentIds, body })`; resuelve `{ broadcast_id, sent }` y refresca todo lo de mensajes. */
export function useBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: broadcast,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MESSAGES_KEY }),
  });
}
