import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '@/api/messages/messages.api';
import { POLL_LIST_MS, unreadKey } from './messageKeys';

/** Total de no leídos para el badge del menú (número), con polling cada 15 s solo con la pestaña visible. */
export function useUnreadCount({ enabled = true } = {}) {
  return useQuery({
    queryKey: unreadKey,
    queryFn: getUnreadCount,
    refetchInterval: POLL_LIST_MS,
    refetchIntervalInBackground: false,
    enabled,
  });
}
