import { describe, expect, it } from 'vitest';
import { appendExchange, withoutRemaining } from '@/utils/chat/chatDay';

const NOW = new Date('2026-11-07T13:30:00.000Z');
const reply = {
  message_id: 'a-2',
  response: 'Probá con mancuernas.',
  suggestions: [{ exercise_id: 'e-7', name: 'Press con mancuernas', reason: 'Tenés mancuernas.' }],
  remaining_today: 16,
};
const earlier = { id: 'a-1', role: 'assistant', content: 'Hola.', created_at: '2026-11-07T13:00:00.000Z' };

describe('appendExchange', () => {
  it('suma la consulta y la respuesta (con sus sugerencias) al final y actualiza el contador', () => {
    expect(appendExchange({ messages: [earlier], remaining_today: 17 }, '¿Y otra?', reply, NOW)).toEqual({
      messages: [
        earlier,
        { id: 'a-2-question', role: 'user', content: '¿Y otra?', created_at: NOW.toISOString() },
        {
          id: 'a-2', role: 'assistant', content: 'Probá con mancuernas.', suggestions: reply.suggestions,
          created_at: NOW.toISOString(),
        },
      ],
      remaining_today: 16,
    });
  });

  it('sin conversación cargada arranca una; sin sugerencias quedan en []', () => {
    const day = appendExchange(undefined, 'Hola', { ...reply, suggestions: undefined }, NOW);
    expect(day.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(day.messages[1].suggestions).toEqual([]);
  });
});

describe('withoutRemaining', () => {
  it('deja el contador en 0 sin tocar los mensajes', () => {
    expect(withoutRemaining({ messages: [earlier], remaining_today: 3 })).toEqual({ messages: [earlier], remaining_today: 0 });
    expect(withoutRemaining(undefined)).toEqual({ messages: [], remaining_today: 0 });
  });
});
