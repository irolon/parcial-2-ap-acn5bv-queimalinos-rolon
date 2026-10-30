import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commentSession, getSession, listSessions } from '@/api/sessions/sessions.api';

export const SESSIONS_KEY = ['sessions'];
const PAGE_SIZE = 20;

/** Historial paginado de a 20; `getNextPageParam` sale de `meta`. */
export function useSessionsInfinite(studentId) {
  return useInfiniteQuery({
    queryKey: [...SESSIONS_KEY, studentId, 'list'],
    queryFn: ({ pageParam }) => listSessions(studentId, { page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: ({ meta }) => (meta.page < meta.total_pages ? meta.page + 1 : undefined),
    enabled: Boolean(studentId),
  });
}

/**
 * Detalle de una sesión; se pide recién cuando `enabled` (fila expandida). Sin
 * `staleTime`: las series pueden llegar después (subida offline del celular o
 * sesión en curso), así que al reabrir se vuelve a pedir mostrando la caché.
 */
export function useSessionDetail(studentId, sessionId, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...SESSIONS_KEY, studentId, 'detail', sessionId],
    queryFn: () => getSession(studentId, sessionId),
    enabled: Boolean(studentId && sessionId) && enabled,
  });
}

/** Guarda el comentario del entrenador y refresca la lista y el detalle de esa sesión. */
export function useCommentSession(studentId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, comment }) => commentSession(sessionId, comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...SESSIONS_KEY, studentId] }),
  });
}
