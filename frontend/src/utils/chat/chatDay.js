/**
 * La conversación del día (lo de GET /chat/today) con un intercambio más al final: la consulta del alumno y la
 * respuesta del POST /chat (con sus sugerencias), y el `remaining_today` nuevo. Sin conversación cargada (falló el
 * GET) arranca una con solo ese intercambio. El id de la consulta se arma con el de la respuesta: el POST no lo trae.
 */
export function appendExchange(day, message, reply, now = new Date()) {
  const createdAt = now.toISOString();
  const exchange = [
    { id: `${reply.message_id}-question`, role: 'user', content: message, created_at: createdAt },
    {
      id: reply.message_id,
      role: 'assistant',
      content: reply.response,
      suggestions: reply.suggestions ?? [],
      created_at: createdAt,
    },
  ];
  return { messages: [...(day?.messages ?? []), ...exchange], remaining_today: reply.remaining_today };
}

/** La conversación con el contador en 0 (el servidor dijo que se llegó al límite). */
export const withoutRemaining = (day) => ({ messages: day?.messages ?? [], remaining_today: 0 });
