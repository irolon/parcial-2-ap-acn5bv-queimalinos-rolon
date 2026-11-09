import { describe, expect, it } from 'vitest';
import {
  ADHERENCE_GOOD,
  ADHERENCE_OK,
  adherencePct,
  adherenceTitle,
  adherenceTone,
} from '@/utils/students/adherence';
import { student } from '../../helpers/students/fixtures';

describe('adherenceTone (umbrales del celular)', () => {
  it('≥ 70 verde, ≥ 50 azul, por debajo coral', () => {
    expect([ADHERENCE_GOOD, ADHERENCE_OK]).toEqual([70, 50]);
    expect(adherenceTone(100)).toBe('good');
    expect(adherenceTone(70)).toBe('good');
    expect(adherenceTone(69)).toBe('accent');
    expect(adherenceTone(50)).toBe('accent');
    expect(adherenceTone(49)).toBe('hot');
    expect(adherenceTone(0)).toBe('hot');
  });
});

describe('adherencePct', () => {
  it('devuelve el pct de adherence_7d', () => {
    expect(adherencePct(student({ adherence_7d: { assigned: 3, done: 2, pct: 67 } }))).toBe(67);
    expect(adherencePct(student({ adherence_7d: { assigned: 2, done: 0, pct: 0 } }))).toBe(0);
  });

  it('null sin adherence_7d o con pct null', () => {
    expect(adherencePct(student())).toBeNull();
    expect(adherencePct(student({ adherence_7d: null }))).toBeNull();
    expect(adherencePct(student({ adherence_7d: { assigned: 0, done: 0, pct: null } }))).toBeNull();
  });
});

describe('adherenceTitle', () => {
  it('cuenta días entrenados de los asignados', () => {
    const s = student({ adherence_7d: { assigned: 3, done: 2, pct: 67 } });
    expect(adherenceTitle(s)).toBe('2 de 3 días asignados entrenados en los últimos 7 días');
  });

  it('sin plan no hay tooltip', () => {
    expect(adherenceTitle(student())).toBeUndefined();
    expect(adherenceTitle(student({ adherence_7d: { assigned: 0, done: 0, pct: null } }))).toBeUndefined();
  });
});
