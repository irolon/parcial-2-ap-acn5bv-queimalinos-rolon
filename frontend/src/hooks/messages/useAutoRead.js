import { useEffect, useMemo, useRef } from 'react';
import { useMarkRead } from './useMarkRead';

/**
 * Marca la conversación como leída al abrirla y cada vez que llega un mensaje nuevo del otro,
 * solo con la pestaña visible (si estaba oculta, lo hace al volver). No llama si no hay no leídos del otro.
 */
export function useAutoRead(studentId, viewerRole, messages) {
  const { mutate } = useMarkRead(studentId);
  const lastUnreadId = useMemo(
    () => messages.findLast((m) => m.sender_role !== viewerRole && !m.read_at)?.id ?? null,
    [messages, viewerRole],
  );

  const marked = useRef(null); // último id ya marcado: no se repite el POST antes del próximo poll

  useEffect(() => {
    if (!lastUnreadId) return undefined;
    const markIfVisible = () => {
      if (document.visibilityState !== 'visible' || marked.current === lastUnreadId) return;
      marked.current = lastUnreadId;
      mutate();
    };
    markIfVisible();
    document.addEventListener('visibilitychange', markIfVisible);
    return () => document.removeEventListener('visibilitychange', markIfVisible);
  }, [lastUnreadId, mutate]);
}
