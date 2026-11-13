import { describe, expect, it } from 'vitest';
import { passwordAgeLabel } from '@/utils/account/passwordAge';

const NOW = new Date('2026-11-09T15:00:00Z');
const daysAgo = (n, extraHours = 0) => new Date(NOW.getTime() - (n * 24 + extraHours) * 3600_000).toISOString();

describe('passwordAgeLabel', () => {
  it('sin fecha → "Nunca la cambiaste"', () => {
    expect(passwordAgeLabel(null, NOW)).toBe('Nunca la cambiaste');
    expect(passwordAgeLabel(undefined, NOW)).toBe('Nunca la cambiaste');
  });

  it('menos de un día → "Modificada hoy"', () => {
    expect(passwordAgeLabel(daysAgo(0, 5), NOW)).toBe('Modificada hoy');
  });

  it('1 día en singular', () => {
    expect(passwordAgeLabel(daysAgo(1, 2), NOW)).toBe('Modificada hace 1 día');
  });

  it('hasta 59 días cuenta días', () => {
    expect(passwordAgeLabel(daysAgo(3), NOW)).toBe('Modificada hace 3 días');
    expect(passwordAgeLabel(daysAgo(59), NOW)).toBe('Modificada hace 59 días');
  });

  it('desde 60 días cuenta meses', () => {
    expect(passwordAgeLabel(daysAgo(61), NOW)).toBe('Modificada hace 2 meses');
    expect(passwordAgeLabel(daysAgo(400), NOW)).toBe('Modificada hace 13 meses');
  });

  it('por defecto usa la fecha actual', () => {
    expect(passwordAgeLabel(new Date().toISOString())).toBe('Modificada hoy');
  });
});
