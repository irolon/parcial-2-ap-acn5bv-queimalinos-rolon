import { useQuery } from '@tanstack/react-query';
import { getConversations, getCounterpart } from '@/api/messages/messages.api';
import { POLL_LIST_MS, conversationsKey, counterpartKey } from './messageKeys';

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

const COUNTERPART_STALE_MS = 5 * 60 * 1000;

/**
 * Con quién habla el usuario en la conversación de `studentId` (para el alumno, su entrenador/a): `{ id, name,
 * avatar_url }` o `null`. Sin polling: el nombre casi no cambia. Lo usan "Nota de …" en Hoy y "Tu entrenador/a"
 * en Mi perfil (comparten la caché).
 */
export function useCounterpart(studentId) {
  return useQuery({
    queryKey: counterpartKey(studentId),
    queryFn: () => getCounterpart(studentId),
    enabled: Boolean(studentId),
    staleTime: COUNTERPART_STALE_MS,
  });
}
