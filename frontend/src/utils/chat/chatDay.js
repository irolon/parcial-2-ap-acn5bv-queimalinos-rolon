import { argentinaDate, pad } from '@/utils/dates';

/** El día de Argentina de `now` (aaaa-mm-dd): la conversación y el límite son de ese día. */
export function chatDayOf(now = new Date()) {
  const { year, month, day } = argentinaDate(now);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * La conversación del día (lo de GET /chat/today) con un intercambio más al final: la consulta del alumno y la
 * respuesta del POST /chat (con sus sugerencias), y el `remaining_today` nuevo. Sin conversación cargada (falló el
 * GET) arranca una con solo ese intercambio. El id de la consulta se arma con el de la respuesta: el POST no lo trae.
 * Los dos llevan el ejercicio sobre el que se preguntó (`exerciseId` y `exerciseName`, como los guarda el servidor):
 * "Aplicar" compara contra él. La rutina queda en null hasta que el servidor la devuelva.
 */
export function appendExchange(day, message, reply, now = new Date(), { exerciseId = null, exerciseName = null } = {}) {
  const base = {
    exercise_id: exerciseId,
    exercise: exerciseId ? { id: exerciseId, name: exerciseName ?? '' } : null,
    routine_name: null,
    created_at: now.toISOString(),
  };
  const exchange = [
    { id: `${reply.message_id}-question`, role: 'user', content: message, ...base, suggestions: [] },
    { id: reply.message_id, role: 'assistant', content: reply.response, ...base, suggestions: reply.suggestions ?? [] },
  ];
  return { messages: [...(day?.messages ?? []), ...exchange], remaining_today: reply.remaining_today };
}

/** La conversación con el contador en 0 (el servidor dijo que se llegó al límite). */
export const withoutRemaining = (day) => ({ messages: day?.messages ?? [], remaining_today: 0 });

/**
 * La conversación recién pedida (`fresh`) con las sugerencias que ya estaban en la caché (`cached`), por id del
 * mensaje del asistente: GET /chat/today no las traía (no se guardaban) y una recarga del día no tiene que borrar los
 * chips que el alumno acaba de recibir. Las que no están en `fresh` no se agregan (no duplica). Desde la GX5 el GET
 * las trae: queda de respaldo.
 */
export function keepSuggestions(fresh, cached) {
  const local = new Map(
    (cached?.messages ?? []).filter((m) => m.suggestions?.length > 0).map((m) => [m.id, m.suggestions]),
  );
  if (local.size === 0) return fresh;
  const messages = fresh.messages.map((m) => (local.has(m.id) && !m.suggestions?.length ? { ...m, suggestions: local.get(m.id) } : m));
  return { ...fresh, messages };
}
