import { useEffect, useRef } from 'react';
import ChatBubble from './ChatBubble';
import ChatThinking from './ChatThinking';

/**
 * La conversación del día, en orden, con la consulta en vuelo (`pending`, su texto) y "Pensando…" al final.
 * `role="log"`: lo nuevo se anuncia sin interrumpir. Baja sola hasta el final cada vez que se suma algo.
 */
export default function ChatLog({ messages, pending, loading }) {
  const ref = useRef(null);
  const last = pending ?? messages.at(-1)?.id;
  useEffect(() => {
    const element = ref.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [last]);
  const empty = !loading && messages.length === 0 && !pending;
  return (
    <div
      ref={ref}
      role="log"
      aria-live="polite"
      aria-busy={loading}
      aria-label="Conversación con el asistente"
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
    >
      {loading && <p className="m-auto font-mono text-[11px] text-ink6">Cargando…</p>}
      {empty && (
        <p className="m-auto max-w-[240px] text-center font-body text-sm text-ink6">
          Preguntale lo que necesites sobre tu entrenamiento.
        </p>
      )}
      {messages.map((message) => <ChatBubble key={message.id} message={message} />)}
      {pending && (
        <>
          <ChatBubble message={{ role: 'user', content: pending }} />
          <ChatThinking />
        </>
      )}
    </div>
  );
}
