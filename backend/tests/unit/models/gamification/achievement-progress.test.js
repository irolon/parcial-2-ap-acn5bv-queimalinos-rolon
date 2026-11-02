import { describe, it, expect } from '@jest/globals';
import { achievementProgress } from '../../../../src/models/gamification/achievement-progress.js';

const FACTS = { sessionsCount: 3, longestStreak: 9, prSessions: 1, fullWeeks: 0 };

describe('achievementProgress', () => {
  it.each([
    [{ type: 'sessions_count', value: 10 }, { current: 3, target: 10 }],
    [{ type: 'streak', days: 30 }, { current: 9, target: 30 }],
    [{ type: 'pr_count', value: 10 }, { current: 1, target: 10 }],
    [{ type: 'full_week', count: 4 }, { current: 0, target: 4 }],
  ])('%j usa el dato que le corresponde', (criteria, expected) => {
    expect(achievementProgress(criteria, FACTS, false)).toEqual(expected);
  });

  it('recorta current a target', () => {
    expect(achievementProgress({ type: 'streak', days: 7 }, FACTS, false)).toEqual({ current: 7, target: 7 });
  });

  it('desbloqueado vale target aunque el dato haya bajado', () => {
    expect(achievementProgress({ type: 'full_week', count: 4 }, FACTS, true)).toEqual({ current: 4, target: 4 });
  });

  it('challenge: 1/1 desbloqueado, 0/1 si no', () => {
    expect(achievementProgress({ type: 'challenge' }, FACTS, true)).toEqual({ current: 1, target: 1 });
    expect(achievementProgress({ type: 'challenge' }, FACTS, false)).toEqual({ current: 0, target: 1 });
  });

  it('tipo desconocido, criterio vacío o meta inválida → 0/1', () => {
    expect(achievementProgress({ type: 'otro', value: 5 }, FACTS, false)).toEqual({ current: 0, target: 1 });
    expect(achievementProgress(null, FACTS, false)).toEqual({ current: 0, target: 1 });
    expect(achievementProgress({ type: 'sessions_count' }, FACTS, false)).toEqual({ current: 0, target: 1 });
    expect(achievementProgress({ type: 'sessions_count', value: 0 }, FACTS, false)).toEqual({ current: 0, target: 1 });
  });

  it('dato faltante cuenta como 0', () => {
    expect(achievementProgress({ type: 'pr_count', value: 1 }, {}, false)).toEqual({ current: 0, target: 1 });
  });
});
