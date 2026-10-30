import { describe, expect, it } from '@jest/globals';
import { buildFacts } from '../../../../src/services/gamification/evaluate-facts.js';

describe('buildFacts · día argentino', () => {
  it('una sesión a las 22:30 AR (01:30 UTC del día siguiente) cuenta en la fecha argentina', () => {
    const closed = [
      { id: 's-1', started_at: '2026-10-30T01:30:00Z', finished_at: '2026-10-30T02:30:00Z' }, // 29/10 22:30 AR
    ];
    const { streak, facts } = buildFacts({ closed, assignedDays: [], recordPairs: [], today: '2026-10-29' });
    expect(streak.last_trained_date).toBe('2026-10-29');
    expect(streak.current_days).toBe(1);
    expect(facts.sessionsCount).toBe(1);
  });

  it('la misma sesión no suma a la racha de la fecha UTC (30/10)', () => {
    const closed = [{ id: 's-1', started_at: '2026-10-30T01:30:00Z', finished_at: '2026-10-30T02:30:00Z' }];
    const { streak } = buildFacts({ closed, assignedDays: [], recordPairs: [], today: '2026-10-30' });
    expect(streak.last_trained_date).toBe('2026-10-29');
    expect(streak.current_days).toBe(1); // ayer entrenó; hoy no corta
  });

  it('dos sesiones el mismo día argentino (22:30 y 08:00 AR) son un solo día de racha', () => {
    const closed = [
      { id: 's-1', started_at: '2026-10-29T11:00:00Z', finished_at: '2026-10-29T12:00:00Z' }, // 29/10 08:00 AR
      { id: 's-2', started_at: '2026-10-30T01:30:00Z', finished_at: '2026-10-30T02:30:00Z' }, // 29/10 22:30 AR
    ];
    const { streak, facts } = buildFacts({ closed, assignedDays: [], recordPairs: [], today: '2026-10-29' });
    expect(streak.current_days).toBe(1);
    expect(facts.sessionsCount).toBe(2);
  });
});
