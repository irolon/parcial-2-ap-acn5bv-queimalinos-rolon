import { useRef } from 'react';
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

const URL_TTL_MS = 45 * 60 * 1000; // la firma dura 1 h: se renueva antes de que venza

/**
 * Cada poll trae URLs firmadas nuevas; si el `src` cambiara, el navegador re-descargaría todas las fotos.
 * Se conserva la primera URL vista por id y se reemplaza solo pasados 45 min (o si antes no había).
 */
function keepStableUrls(page, seen) {
  const now = Date.now();
  const data = page.data.map((m) => {
    if (!m.image_url) return m;
    const prev = seen.get(m.id);
    if (prev && now - prev.at < URL_TTL_MS) return { ...m, image_url: prev.url };
    seen.set(m.id, { url: m.image_url, at: now });
    return m;
  });
  return { ...page, data };
}

/**
 * Historial de la conversación con `studentId`, con polling cada 4 s solo con la pestaña visible.
 * Devuelve la query de TanStack más `messages` (cronológico, con los pendientes `tmp-…` al final), `counterpart`,
 * `hasMore`, `fetchOlder()` ("Ver anteriores") e `isFetchingOlder`.
 * El polling refetchea todas las páginas cargadas; los `image_url` se mantienen estables por id y se renuevan a los 45 min.
 * Limitación conocida (no se corrige): si el poll trae el mensaje enviado antes de que responda el POST, se ve
 * un instante duplicado (el temporal `tmp-…` y el del servidor) hasta que el POST confirma y se quita el temporal.
 */
export function useMessages(studentId) {
  const seenUrls = useRef(new Map());
  const query = useInfiniteQuery({
    queryKey: messagesKey(studentId),
    queryFn: async ({ pageParam }) =>
      keepStableUrls(await getMessages(studentId, { before: pageParam }), seenUrls.current),
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
