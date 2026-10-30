import { CRITERIA, evaluateCriteria } from '../../../../src/models/gamification/criteria.js';

const facts = { sessionsCount: 10, longestStreak: 7, prSessions: 1, fullWeeks: 0 };
const ach = (code, criteria) => ({ code, criteria });

describe('CRITERIA', () => {
  it('expone un evaluador por tipo', () => {
    expect(Object.keys(CRITERIA).sort()).toEqual(
      ['challenge', 'full_week', 'pr_count', 'sessions_count', 'streak'].sort()
    );
  });

  it('sessions_count: >= value', () => {
    expect(CRITERIA.sessions_count({ value: 10 }, facts)).toBe(true);
    expect(CRITERIA.sessions_count({ value: 11 }, facts)).toBe(false);
  });

  it('streak: longestStreak >= days', () => {
    expect(CRITERIA.streak({ days: 7 }, facts)).toBe(true);
    expect(CRITERIA.streak({ days: 30 }, facts)).toBe(false);
  });

  it('pr_count: prSessions >= value', () => {
    expect(CRITERIA.pr_count({ value: 1 }, facts)).toBe(true);
    expect(CRITERIA.pr_count({ value: 10 }, facts)).toBe(false);
  });

  it('full_week: fullWeeks >= count', () => {
    expect(CRITERIA.full_week({ count: 1 }, facts)).toBe(false);
    expect(CRITERIA.full_week({ count: 1 }, { ...facts, fullWeeks: 1 })).toBe(true);
  });

  it('challenge: siempre false', () => {
    expect(CRITERIA.challenge({}, { sessionsCount: 999 })).toBe(false);
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
