import { describe, expect, it } from 'vitest';
import {
  FREQUENCY_OPTIONS,
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  frequencyLabel,
  goalLabel,
  levelLabel,
} from '@/utils/students/studentOptions';

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

describe('frecuencia semanal', () => {
  it('opciones de 1 a 7 días, con "Sin definir" primero', () => {
    expect(FREQUENCY_OPTIONS[0]).toEqual({ value: '', label: 'Sin definir' });
    expect(FREQUENCY_OPTIONS.slice(1).map((o) => o.value)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(FREQUENCY_OPTIONS[1].label).toBe('1 día / semana');
    expect(FREQUENCY_OPTIONS[4].label).toBe('4 días / semana');
  });

  it('frequencyLabel: "4 días/semana", "1 día/semana" o undefined sin dato', () => {
    expect(frequencyLabel(4)).toBe('4 días/semana');
    expect(frequencyLabel(1)).toBe('1 día/semana');
    expect(frequencyLabel(null)).toBeUndefined();
    expect(frequencyLabel(9)).toBeUndefined();
  });
});
