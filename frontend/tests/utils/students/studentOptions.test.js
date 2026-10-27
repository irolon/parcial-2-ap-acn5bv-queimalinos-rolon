import { describe, expect, it } from 'vitest';
import { GOAL_OPTIONS, LEVEL_OPTIONS, goalLabel, levelLabel } from '@/utils/students/studentOptions';

describe('goalLabel / levelLabel', () => {
  it('traducen los valores del backend', () => {
    expect(goalLabel('hypertrophy')).toBe('Ganar masa muscular');
    expect(levelLabel('advanced')).toBe('Avanzado');
  });

  it('devuelven undefined si falta o no se conoce', () => {
    expect(goalLabel(null)).toBeUndefined();
    expect(goalLabel('')).toBeUndefined();
    expect(levelLabel('experto')).toBeUndefined();
  });

  it('cada lista arranca con "Sin definir"', () => {
    expect(GOAL_OPTIONS[0]).toEqual({ value: '', label: 'Sin definir' });
    expect(LEVEL_OPTIONS[0]).toEqual({ value: '', label: 'Sin definir' });
  });
});
