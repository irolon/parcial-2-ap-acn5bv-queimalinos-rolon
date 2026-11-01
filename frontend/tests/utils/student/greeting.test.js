import { describe, expect, it } from 'vitest';
import { greetingDate } from '@/utils/student/greeting';

describe('greetingDate', () => {
  it('escribe el día con mayúscula y el mes en minúscula', () => {
    expect(greetingDate(new Date('2026-11-01T15:00:00Z'))).toBe('Domingo 1 de noviembre');
  });

  it('no le pone cero al día del mes', () => {
    expect(greetingDate(new Date('2026-11-01T15:00:00Z'))).not.toContain('01');
    expect(greetingDate(new Date('2026-10-10T15:00:00Z'))).toBe('Sábado 10 de octubre');
  });

  it('respeta las tildes de los días', () => {
    expect(greetingDate(new Date('2026-01-07T15:00:00Z'))).toBe('Miércoles 7 de enero');
    expect(greetingDate(new Date('2025-04-22T15:00:00Z'))).toBe('Martes 22 de abril');
  });

  it('la fecha es la de Argentina: el domingo 23:59 sigue siendo domingo y el lunes 00:00 ya es lunes', () => {
    expect(greetingDate(new Date('2026-11-02T02:59:00Z'))).toBe('Domingo 1 de noviembre');
    expect(greetingDate(new Date('2026-11-02T03:00:00Z'))).toBe('Lunes 2 de noviembre');
  });

  it('una hora de la madrugada en UTC todavía es el día anterior en Argentina', () => {
    expect(greetingDate(new Date('2027-01-01T02:59:59Z'))).toBe('Jueves 31 de diciembre');
    expect(greetingDate(new Date('2027-01-01T03:00:00Z'))).toBe('Viernes 1 de enero');
  });

  it('cubre los doce meses', () => {
    const months = Array.from({ length: 12 }, (_, i) => greetingDate(new Date(Date.UTC(2026, i, 15, 15))).split(' de ')[1]);
    expect(months).toEqual([
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ]);
  });
});
