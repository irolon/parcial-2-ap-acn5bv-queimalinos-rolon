import {
  CRITERIA,
  criteriaGoal,
  evaluateCriteria,
  meetsCriteria,
} from '../../../../src/models/gamification/criteria.js';

const facts = { sessionsCount: 10, longestStreak: 7, prSessions: 1, fullWeeks: 0 };
const ach = (code, criteria) => ({ code, criteria });

describe('CRITERIA', () => {
  it('tiene una entrada por tipo', () => {
    expect(Object.keys(CRITERIA).sort()).toEqual(
      ['challenge', 'full_week', 'pr_count', 'sessions_count', 'streak'].sort()
    );
  });
});

describe('meetsCriteria', () => {
  it('sessions_count: sessionsCount >= value', () => {
    expect(meetsCriteria({ type: 'sessions_count', value: 10 }, facts)).toBe(true);
    expect(meetsCriteria({ type: 'sessions_count', value: 11 }, facts)).toBe(false);
  });

  it('streak: longestStreak >= days', () => {
    expect(meetsCriteria({ type: 'streak', days: 7 }, facts)).toBe(true);
    expect(meetsCriteria({ type: 'streak', days: 30 }, facts)).toBe(false);
  });

  it('pr_count: prSessions >= value', () => {
    expect(meetsCriteria({ type: 'pr_count', value: 1 }, facts)).toBe(true);
    expect(meetsCriteria({ type: 'pr_count', value: 10 }, facts)).toBe(false);
  });

  it('full_week: fullWeeks >= count', () => {
    expect(meetsCriteria({ type: 'full_week', count: 1 }, facts)).toBe(false);
    expect(meetsCriteria({ type: 'full_week', count: 1 }, { ...facts, fullWeeks: 1 })).toBe(true);
  });

  it('challenge: nunca, aunque los datos sobren', () => {
    expect(meetsCriteria({ type: 'challenge' }, { sessionsCount: 999 })).toBe(false);
  });

  it.each([0, -1, 'abc', null])('una meta inválida (%p) nunca se cumple', (value) => {
    expect(meetsCriteria({ type: 'sessions_count', value }, facts)).toBe(false);
  });

  it('dato faltante cuenta como 0', () => {
    expect(meetsCriteria({ type: 'pr_count', value: 1 }, {})).toBe(false);
  });
});

describe('criteriaGoal', () => {
  it('meta y dato del tipo', () => {
    expect(criteriaGoal({ type: 'full_week', count: 4 })).toEqual({ goal: 4, fact: 'fullWeeks' });
  });

  it('null para challenge, tipo desconocido, criterio vacío o meta no mayor a 0', () => {
    expect(criteriaGoal({ type: 'challenge' })).toBeNull();
    expect(criteriaGoal({ type: 'inventado', value: 3 })).toBeNull();
    expect(criteriaGoal(null)).toBeNull();
    expect(criteriaGoal({ type: 'streak' })).toBeNull();
    expect(criteriaGoal({ type: 'streak', days: 0 })).toBeNull();
  });
});

describe('evaluateCriteria', () => {
  it('devuelve solo los logros cumplidos', () => {
    const catalog = [
      ach('FIRST_SESSION', { type: 'sessions_count', value: 1 }),
      ach('SESSIONS_50', { type: 'sessions_count', value: 50 }),
      ach('STREAK_7_DAYS', { type: 'streak', days: 7 }),
      ach('FIRST_FULL_WEEK', { type: 'full_week', count: 1 }),
      ach('CHALLENGE_DONE', { type: 'challenge' }),
    ];
    expect(evaluateCriteria(catalog, facts).map((a) => a.code)).toEqual([
      'FIRST_SESSION',
      'STREAK_7_DAYS',
    ]);
  });

  it('un tipo desconocido o un criterio vacío no se cumple', () => {
    const catalog = [ach('X', { type: 'inventado', value: 0 }), ach('Y', {}), ach('Z', null)];
    expect(evaluateCriteria(catalog, facts)).toEqual([]);
  });
});
