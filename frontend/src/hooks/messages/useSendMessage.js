import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sendMessage } from '@/api/messages/messages.api';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { conversationsKey } from './messageKeys';
import { insertConfirmed, pendingStore } from './pending';

let counter = 0;

function makeTemp(studentId, role, { body, file }) {
  counter += 1;
  return {
    id: `tmp-${Date.now()}-${counter}`,
    student_id: studentId,
    sender_role: role,
    body: body || null,
    image_url: file && URL.createObjectURL ? URL.createObjectURL(file) : null,
    broadcast_id: null,
    read_at: null,
    created_at: new Date().toISOString(),
    status: 'sending',
    error: null,
    file: file ?? null,
  };
}

/**
 * Envío optimista a la conversación `studentId`. Devuelve `{ send, retry, discard }`:
 * - `send({ body, file })`: agrega al instante un temporal `tmp-…` con `status: 'sending'` (se ve en `useMessages`).
 *   Al confirmar, el temporal se quita y el mensaje del servidor entra en la caché del historial; resuelve ese mensaje.
 *   Si falla, el temporal queda con `status: 'failed'` y `error` (mensaje del servidor); resuelve `null`, no tira.
 * - `retry(tmp)`: reenvía el mismo temporal (mismo texto y foto). `discard(tmp)`: lo descarta.
 */
export function useSendMessage(studentId) {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role ?? 'trainer');

  const deliver = useCallback(
    async (tmp) => {
      const store = pendingStore(queryClient, studentId);
      store.patch(tmp.id, { status: 'sending', error: null });
      try {
        const message = await sendMessage(studentId, { body: tmp.body, file: tmp.file });
        insertConfirmed(queryClient, studentId, message);
        store.remove(tmp);
        queryClient.invalidateQueries({ queryKey: conversationsKey });
        return message;
      } catch (err) {
        store.patch(tmp.id, { status: 'failed', error: err?.message ?? 'No se envió' });
        return null;
      }
    },
    [queryClient, studentId],
  );

  const send = useCallback(
    (content) => {
      const tmp = makeTemp(studentId, role, content);
      pendingStore(queryClient, studentId).add(tmp);
      return deliver(tmp);
    },
    [queryClient, studentId, role, deliver],
  );

  const discard = useCallback((tmp) => pendingStore(queryClient, studentId).remove(tmp), [queryClient, studentId]);

  return { send, retry: deliver, discard };
}
