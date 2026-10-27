import { describe, expect, it } from 'vitest';
import { ageFrom } from '@/utils/students/age';

const NOW = new Date('2026-10-24T12:00:00Z');

describe('ageFrom', () => {
  it('calcula la edad según el cumpleaños', () => {
    expect(ageFrom('1999-10-24', NOW)).toBe(27);
    expect(ageFrom('1999-10-25', NOW)).toBe(26);
    expect(ageFrom('1999-01-01', NOW)).toBe(27);
  });

  it('usa el día local: la noche antes del cumpleaños todavía no lo cumplió', () => {
    const lateNight = new Date(2026, 9, 24, 23, 30);
    expect(ageFrom('1999-10-25', lateNight)).toBe(26);
    expect(ageFrom('1999-10-24', new Date(2026, 9, 24, 0, 30))).toBe(27);
  });

  it('sin fecha o inválida devuelve null', () => {
    expect(ageFrom(null, NOW)).toBeNull();
    expect(ageFrom('nada', NOW)).toBeNull();
  });
});
