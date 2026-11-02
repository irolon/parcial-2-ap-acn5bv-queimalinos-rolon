import { useEffect, useMemo, useRef } from 'react';
import { useMarkRead } from './useMarkRead';

/**
 * Marca la conversación como leída al abrirla y cada vez que llega un mensaje nuevo del otro,
 * solo con la pestaña visible (si estaba oculta, lo hace al volver). No llama si no hay no leídos del otro.
 * `dataUpdatedAt` (de la query de mensajes) hace que cada refresco del polling reintente si el POST falló,
 * aunque el último no leído sea el mismo. Nunca hay dos POST a la vez.
 */
export function useAutoRead(studentId, viewerRole, messages, dataUpdatedAt) {
  const { mutate } = useMarkRead(studentId);
  const lastUnreadId = useMemo(
    () => messages.findLast((m) => m.sender_role !== viewerRole && !m.read_at)?.id ?? null,
    [messages, viewerRole],
  );

  const marked = useRef(null); // último id marcado (o en vuelo): no se repite el POST para el mismo
  const inFlight = useRef(false);

  useEffect(() => {
    if (!lastUnreadId) return undefined;
    const markIfVisible = () => {
      if (document.visibilityState !== 'visible' || inFlight.current || marked.current === lastUnreadId) return;
      marked.current = lastUnreadId;
      inFlight.current = true;
      mutate(undefined, {
        // Si falla se libera el id: el próximo refresco (o volver a la pestaña) reintenta.
        onError: () => {
          if (marked.current === lastUnreadId) marked.current = null;
        },
        onSettled: () => {
          inFlight.current = false;
        },
      });
    };
    markIfVisible();
    document.addEventListener('visibilitychange', markIfVisible);
    return () => document.removeEventListener('visibilitychange', markIfVisible);
  }, [lastUnreadId, mutate, dataUpdatedAt]);
}
