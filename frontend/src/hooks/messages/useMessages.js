import { useInfiniteQuery } from '@tanstack/react-query';
import { getMessages } from '@/api/messages/messages.api';
import { POLL_THREAD_MS, messagesKey } from './messageKeys';
import { usePending } from './pending';

/**
 * Junta las páginas (la primera es la más nueva) en orden cronológico y suma los pendientes al final.
 * Sin repetidos por `id`: el refetch del polling puede traer el mensaje que el optimista ya insertó.
 */
export function flattenMessages(pages = [], pending = []) {
  const byId = new Map();
  [...pages].reverse().forEach((page) => page.data.forEach((m) => byId.set(m.id, m)));
  pending.forEach((m) => byId.set(m.id, m));
  return [...byId.values()];
}

/**
 * Historial de la conversación con `studentId`, con polling cada 4 s solo con la pestaña visible.
 * Devuelve la query de TanStack más `messages` (cronológico, con los pendientes `tmp-…` al final), `counterpart`,
 * `hasMore`, `fetchOlder()` ("Ver anteriores") e `isFetchingOlder`.
 * El polling refetchea todas las páginas cargadas, así los `image_url` firmados se renuevan solos.
 */
export function useMessages(studentId) {
  const query = useInfiniteQuery({
    queryKey: messagesKey(studentId),
    queryFn: ({ pageParam }) => getMessages(studentId, { before: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.meta?.next_before ?? undefined,
    refetchInterval: POLL_THREAD_MS,
    refetchIntervalInBackground: false,
    enabled: Boolean(studentId),
  });
  const pending = usePending(studentId);
  const pages = query.data?.pages;
  return {
    ...query,
    messages: flattenMessages(pages, pending),
    counterpart: pages?.[0]?.counterpart ?? null,
    hasMore: Boolean(query.hasNextPage),
    fetchOlder: query.fetchNextPage,
    isFetchingOlder: query.isFetchingNextPage,
  };
}
