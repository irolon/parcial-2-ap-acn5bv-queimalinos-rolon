import { useEffect, useRef, useState } from 'react';
import { useOnline } from '@/hooks/shared/useOnline';
import { chatDayOf } from '@/utils/chat/chatDay';
import { LIMIT_TEXT, OFFLINE_TEXT, chatProblem } from '@/utils/chat/chatProblem';
import { useSendChat } from './useChat';

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
 * La caja de la consulta de hoy, compartida por el panel de la sesión y la página Asistente IA: el texto, `ask()` (manda
 * con `sessionId` y el ejercicio `exercise` = `{ exerciseId, name }` o null; si sale bien vacía la caja, si falla el
 * texto queda para Reintentar), el aviso que toca (`notice`), si la caja está bloqueada (sin conexión o en el límite) y
 * lo que queda hoy. `day` es el `useChatToday(now)` de quien la usa.
 */
export function useAskAssistant({ now, day, sessionId, exercise }) {
  const online = useOnline();
  const send = useSendChat();
  const [text, setText] = useState('');
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
  return {
    text,
    setText,
    ask,
    notice,
    remaining,
    disabled: blocked || send.isPending,
    pending: send.isPending ? send.variables.message : null,
    online,
  };
}
