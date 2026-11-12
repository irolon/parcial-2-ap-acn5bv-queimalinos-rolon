import { useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useChatToday } from '@/hooks/chat/useChat';
import { useAskAssistant } from '@/hooks/chat/useAskAssistant';
import { useToday } from '@/hooks/shared/useToday';
import ChatComposer from './ChatComposer';
import ChatLog from './ChatLog';
import ChatNotice from './ChatNotice';

export const ASSISTANT_PANEL_ID = 'assistant-panel';

// Debajo de 1280 px es una hoja inferior sin fondo oscuro (la sesión de atrás se sigue usando; la página le deja lugar
// abajo con `ASSISTANT_SHEET_SPACE`); desde 1280 px es una columna al lado de la sesión, que no tapa nada.
const LAYOUT = [
  'fixed inset-x-0 bottom-0 z-30 flex h-[50dvh] flex-col rounded-t-2xl border-t border-ink3 bg-ink1 shadow-xl',
  'md:left-16 lg:left-[220px]',
  'xl:sticky xl:top-4 xl:bottom-auto xl:left-auto xl:z-auto xl:h-[calc(100dvh-140px)] xl:w-[340px] xl:shrink-0',
  'xl:rounded-2xl xl:border xl:shadow-none',
  'focus:outline-none',
].join(' ');
export const ASSISTANT_SHEET_SPACE = 'pb-[50dvh] xl:pb-0';

/**
 * El asistente durante la sesión activa: la conversación del día, sobre qué ejercicio se pregunta (`exercise`, el
 * de la sesión a la vista, o null), atajos, el contador y los avisos. La consulta viaja con `sessionId` y el
 * ejercicio (la caja es `useAskAssistant`, la misma de la página Asistente IA). Si falla, el texto queda para Reintentar.
 * Sin conexión o en el límite la caja se deshabilita; el
 * estado de conexión sigue al del navegador: al volver, se va el aviso y la caja se habilita. Con el panel abierto pasada
 * la medianoche de Argentina (`useToday`) se pide la conversación del día nuevo y se olvida el error de ayer.
 * No toca la sesión: lo que pase acá no frena el registro de series ni el descanso. Cerrar y Escape llaman a `onClose`.
 */
export default function AssistantPanel({ exercise, sessionId, onClose }) {
  const now = useToday();
  const day = useChatToday(now);
  const box = useAskAssistant({ now, day, sessionId, exercise });
  const panelRef = useRef(null);
  useEffect(() => panelRef.current?.focus({ preventScroll: true }), []);

  const onKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onClose();
  };

  return (
    <aside
      ref={panelRef}
      id={ASSISTANT_PANEL_ID}
      aria-label="Asistente"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={LAYOUT}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-ink2 px-4 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-bone0">
            <Sparkles size={16} className="text-accentText" aria-hidden="true" />
            Asistente
          </h2>
          {exercise && (
            <p className="mt-1 truncate font-mono text-[10px] tracking-[0.3px] text-ink6">
              {`Preguntando sobre: ${exercise.name}`}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Cerrar asistente"
          onClick={onClose}
          className="shrink-0 cursor-pointer rounded-md p-1 text-ink6 hover:text-bone0 focus-visible:outline-2 focus-visible:outline-accentText"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <ChatLog messages={day.data?.messages ?? []} pending={box.pending} loading={day.isPending && box.online} />
      {box.notice && <ChatNotice text={box.notice.text} onRetry={box.notice.onRetry} />}
      <ChatComposer
        value={box.text}
        onChange={box.setText}
        onSend={box.ask}
        disabled={box.disabled}
        remaining={box.remaining}
      />
    </aside>
  );
}
