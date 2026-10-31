import { describe, expect, it } from 'vitest';
import { durationLabel, goalLabel } from '@/utils/challenges/challengeFormat';

const goal = (goal_type, goal_value) => ({ goal_type, goal_value });

describe('goalLabel', () => {
  it('sesiones, racha y peso objetivo', () => {
    expect(goalLabel(goal('sessions_count', 12))).toBe('12 sesiones');
    expect(goalLabel(goal('streak', 14))).toBe('Racha de 14 días');
    expect(goalLabel(goal('weight_target', 75))).toBe('Llegar a 75 kg');
  });

  it('volumen en kg o toneladas es-AR', () => {
    expect(goalLabel(goal('volume', 800))).toBe('800 kg de volumen');
    expect(goalLabel(goal('volume', 10000))).toBe('10 t de volumen');
    expect(goalLabel(goal('volume', 12500))).toBe('12,5 t de volumen');
  });
});

describe('durationLabel', () => {
  it('días', () => {
    expect(durationLabel(30)).toBe('30 días');
    expect(durationLabel(1)).toBe('1 día');
  });
});
