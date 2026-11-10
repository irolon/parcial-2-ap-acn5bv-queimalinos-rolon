import { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useChatToday, useSendChat } from '@/hooks/chat/useChat';
import { useOnline } from '@/hooks/shared/useOnline';
import { useToday } from '@/hooks/shared/useToday';
import { chatDayOf } from '@/utils/chat/chatDay';
import { LIMIT_TEXT, OFFLINE_TEXT, chatProblem } from '@/utils/chat/chatProblem';
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

const LOAD_ERROR = 'No pudimos cargar la conversación de hoy.';

// El aviso que toca, de a uno: sin conexión (sin Reintentar: no serviría), el error de la última consulta, la carga
// fallida o el límite.
function noticeFor({ online, problem, day, remaining, retrySend }) {
  if (!online) return { text: OFFLINE_TEXT };
  if (problem) return { text: problem.text, onRetry: problem.retry ? retrySend : undefined };
  if (day.isError && !day.data) return { text: LOAD_ERROR, onRetry: () => day.refetch() };
  return remaining === 0 ? { text: LIMIT_TEXT } : null;
}

/** Al volver la conexión se olvida la falla de red de la última consulta (el texto sigue en la caja para mandarlo). */
function useClearOnReconnect(online, offlineFailure, reset) {
  const wasOnline = useRef(online);
  useEffect(() => {
    const reconnected = online && !wasOnline.current;
    wasOnline.current = online;
    if (reconnected && offlineFailure) reset();
  }, [online, offlineFailure, reset]);
}

/** Pasada la medianoche se olvida el error de la última consulta (un 429 del límite de ayer ya no vale). */
function useClearOnNewDay(today, reset) {
  const lastDay = useRef(today);
  useEffect(() => {
    if (today === lastDay.current) return;
    lastDay.current = today;
    reset();
  }, [today, reset]);
}

/**
 * El asistente durante la sesión activa: la conversación del día, sobre qué ejercicio se pregunta (`exercise`, el
 * de la sesión a la vista, o null), atajos, el contador y los avisos. La consulta viaja con `sessionId` y el
 * ejercicio. Si falla, el texto queda en la caja para Reintentar. Sin conexión o en el límite la caja se deshabilita; el
 * estado de conexión sigue al del navegador: al volver, se va el aviso y la caja se habilita. Con el panel abierto pasada
 * la medianoche de Argentina (`useToday`) se pide la conversación del día nuevo y se olvida el error de ayer.
 * No toca la sesión: lo que pase acá no frena el registro de series ni el descanso. Cerrar y Escape llaman a `onClose`.
 */
export default function AssistantPanel({ exercise, sessionId, onClose }) {
  const online = useOnline();
  const now = useToday();
  const day = useChatToday(now);
  const send = useSendChat();
  const [text, setText] = useState('');
  const panelRef = useRef(null);
  useEffect(() => panelRef.current?.focus({ preventScroll: true }), []);

  const problem = chatProblem(send.error);
  const remaining = day.data?.remaining_today;
  const blocked = !online || remaining === 0 || problem?.kind === 'limit';
  useClearOnReconnect(online, problem?.kind === 'offline', send.reset);
  useClearOnNewDay(chatDayOf(now), send.reset);
  const ask = () => {
    const message = text.trim();
    if (!message || send.isPending) return;
    const context = { message, sessionId, exerciseId: exercise?.exerciseId, exerciseName: exercise?.name };
    send.mutate(context, { onSuccess: () => setText('') });
  };
  const notice = noticeFor({ online, problem, day, remaining, retrySend: ask });

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
      <ChatLog
        messages={day.data?.messages ?? []}
        pending={send.isPending ? send.variables.message : null}
        loading={day.isPending && online}
      />
      {notice && <ChatNotice text={notice.text} onRetry={notice.onRetry} />}
      <ChatComposer
        value={text}
        onChange={setText}
        onSend={ask}
        disabled={blocked || send.isPending}
        remaining={remaining}
      />
    </aside>
  );
}
