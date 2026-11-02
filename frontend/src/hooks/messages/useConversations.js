import { useQuery } from '@tanstack/react-query';
import { getConversations } from '@/api/messages/messages.api';
import { POLL_LIST_MS, conversationsKey } from './messageKeys';

/** Conversaciones del PT (una por alumno activo), con polling cada 15 s solo con la pestaña visible. */
export function useConversations({ enabled = true } = {}) {
  return useQuery({
    queryKey: conversationsKey,
    queryFn: getConversations,
    refetchInterval: POLL_LIST_MS,
    refetchIntervalInBackground: false,
    enabled,
  });
}
