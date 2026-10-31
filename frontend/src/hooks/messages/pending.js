import { useQuery } from '@tanstack/react-query';
import { messagesKey, pendingKey } from './messageKeys';

// Mensajes optimistas ("sending" | "failed") de una conversación. Se guardan en la caché de React Query
// (clave `pendingKey`) y no en estado de componente: `useMessages` y `useSendMessage` los comparten
// y sobreviven a que la pantalla se desmonte mientras se envía.

/** Lista reactiva de pendientes de la conversación. */
export function usePending(studentId) {
  const { data } = useQuery({
    queryKey: pendingKey(studentId),
    queryFn: () => [],
    initialData: [],
    enabled: false,
    staleTime: Infinity,
  });
  return data;
}

/** Operaciones sobre los pendientes (reciben el `queryClient`). */
export function pendingStore(queryClient, studentId) {
  const key = pendingKey(studentId);
  const read = () => queryClient.getQueryData(key) ?? [];
  const release = (tmp) => {
    if (tmp.image_url?.startsWith('blob:')) URL.revokeObjectURL?.(tmp.image_url);
  };
  return {
    add: (tmp) => queryClient.setQueryData(key, [...read(), tmp]),
    patch: (id, changes) => queryClient.setQueryData(key, read().map((m) => (m.id === id ? { ...m, ...changes } : m))),
    remove: (tmp) => {
      release(tmp);
      queryClient.setQueryData(key, read().filter((m) => m.id !== tmp.id));
    },
  };
}

/** Agrega el mensaje confirmado a la página más nueva de la caché del historial (si ya está, no hace nada). */
export function insertConfirmed(queryClient, studentId, message) {
  queryClient.setQueryData(messagesKey(studentId), (old) => {
    if (!old?.pages?.length) return old;
    if (old.pages.some((page) => page.data.some((m) => m.id === message.id))) return old;
    const [first, ...rest] = old.pages;
    return { ...old, pages: [{ ...first, data: [...first.data, message] }, ...rest] };
  });
}
