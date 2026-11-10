import { describe, it, expect } from '@jest/globals';
import { groupByDay } from '../../../../src/models/chat/chat-history.js';

// Mensajes de los más nuevos a los más viejos, como los lee el repositorio. Las horas son UTC (AR = UTC-3).
const msg = (id, role, created_at) => ({ id, role, created_at });
const pair = (n, created_at) => [msg(`a${n}`, 'assistant', created_at), msg(`u${n}`, 'user', created_at)];

describe('chat-history · groupByDay', () => {
  it('agrupa por día argentino: 23:59 AR (02:59 UTC del día siguiente) va a su día', () => {
    const rows = [...pair(2, '2026-11-06T12:00:00.000Z'), ...pair(1, '2026-11-06T02:59:00.000Z')];
    const { days } = groupByDay(rows, 7, 20);
    expect(days.map((d) => d.date)).toEqual(['2026-11-06', '2026-11-05']);
  });

  it('días del más nuevo al más viejo; mensajes de cada día en orden, la consulta antes que la respuesta', () => {
    const rows = [...pair(3, '2026-11-06T15:00:00.000Z'), ...pair(2, '2026-11-06T13:00:00.000Z'), ...pair(1, '2026-11-04T13:00:00.000Z')];
    const { days, next_before } = groupByDay(rows, 7, 20);
    expect(days.map((d) => d.date)).toEqual(['2026-11-06', '2026-11-04']);
    expect(days[1].messages.map((m) => m.id)).toEqual(['u1', 'a1']);
    expect(days[0].messages.map((m) => m.id)).toEqual(['u2', 'a2', 'u3', 'a3']);
    expect(next_before).toBeNull();
  });

  it('sin mensajes: sin días y sin más', () => {
    expect(groupByDay([], 7, 20)).toEqual({ days: [], next_before: null });
  });

  it('más días que los pedidos: devuelve `days` y next_before es el más viejo devuelto', () => {
    const rows = [1, 2, 3].flatMap((d) => pair(d, `2026-11-0${7 - d}T13:00:00.000Z`));
    const { days, next_before } = groupByDay(rows, 2, 20);
    expect(days.map((d) => d.date)).toEqual(['2026-11-06', '2026-11-05']);
    expect(next_before).toBe('2026-11-05');
  });

  it('en el tope (days × límite × 2) descarta el día más viejo, que pudo quedar cortado', () => {
    // days 2 × límite 2 × 2 = 8 filas justas: el 05 pudo tener más consultas que no entraron.
    const rows = [...pair(4, '2026-11-06T14:00:00.000Z'), ...pair(3, '2026-11-06T13:00:00.000Z'),
      ...pair(2, '2026-11-05T14:00:00.000Z'), ...pair(1, '2026-11-05T13:00:00.000Z')];
    const { days, next_before } = groupByDay(rows, 2, 2);
    expect(days.map((d) => d.date)).toEqual(['2026-11-06']);
    expect(next_before).toBe('2026-11-06');
  });

  it('en el tope con un solo día no lo descarta (no quedaría nada)', () => {
    const rows = [...pair(2, '2026-11-06T14:00:00.000Z'), ...pair(1, '2026-11-06T13:00:00.000Z')];
    const { days, next_before } = groupByDay(rows, 1, 2);
    expect(days.map((d) => d.messages.length)).toEqual([4]);
    expect(next_before).toBe('2026-11-06');
  });
});
