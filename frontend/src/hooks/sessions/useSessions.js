import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commentSession, getSession, listSessions } from '@/api/sessions/sessions.api';

export const SESSIONS_KEY = ['sessions'];
const PAGE_SIZE = 20;
const DETAIL_STALE_MS = 5 * 60 * 1000;

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

/** Detalle de una sesión; se pide recién cuando `enabled` (fila expandida) y queda en caché. */
export function useSessionDetail(studentId, sessionId, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...SESSIONS_KEY, studentId, 'detail', sessionId],
    queryFn: () => getSession(studentId, sessionId),
    staleTime: DETAIL_STALE_MS, // una sesión terminada no cambia: se pide una vez
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
