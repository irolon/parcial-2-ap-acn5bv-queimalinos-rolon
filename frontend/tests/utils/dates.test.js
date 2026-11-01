import { describe, expect, it, vi } from 'vitest';
import {
  argentinaDate,
  formatDateAR,
  formatDayMonthAR,
  greetingDate,
  localInputValue,
  pad,
  todayString,
} from '@/utils/dates';

describe('argentinaDate', () => {
  // Argentina es UTC-3 todo el año: las 23:59 de allá son las 02:59 UTC del día siguiente.
  it('da año, mes, día y día de la semana (1 = lunes) en hora argentina', () => {
    expect(argentinaDate(new Date('2026-11-01T15:00:00Z'))).toMatchObject({ year: 2026, month: 11, day: 1, weekday: 7 });
    expect(argentinaDate(new Date('2026-10-28T15:00:00Z'))).toMatchObject({ month: 10, day: 28, weekday: 3 });
  });

  it('el domingo 23:59 es domingo y el lunes 00:00 es lunes, aunque en UTC los dos sean lunes', () => {
    const sunday = argentinaDate(new Date('2026-11-02T02:59:00Z'));
    const monday = argentinaDate(new Date('2026-11-02T03:00:00Z'));
    expect([sunday.day, sunday.weekday]).toEqual([1, 7]);
    expect([monday.day, monday.weekday]).toEqual([2, 1]);
    expect(monday.dayNumber - sunday.dayNumber).toBe(1);
  });

  it('cruza el fin de año con la fecha de Argentina', () => {
    expect(argentinaDate(new Date('2027-01-01T02:59:59Z'))).toMatchObject({ year: 2026, month: 12, day: 31, weekday: 4 });
    expect(argentinaDate(new Date('2027-01-01T03:00:00Z'))).toMatchObject({ year: 2027, month: 1, day: 1, weekday: 5 });
  });

  it('dayNumber suma uno por día y se puede restar para comparar días', () => {
    const first = argentinaDate(new Date('2026-10-26T03:00:00Z')).dayNumber;
    expect(argentinaDate(new Date('2026-10-26T02:59:00Z')).dayNumber).toBe(first - 1);
    expect(argentinaDate(new Date('2026-11-01T20:00:00Z')).dayNumber).toBe(first + 6);
  });

  it('no depende de la zona horaria del navegador: nunca lee la hora local', () => {
    const local = ['getHours', 'getDate', 'getDay', 'getMonth', 'getFullYear', 'getTimezoneOffset'];
    for (const name of local) {
      vi.spyOn(Date.prototype, name).mockImplementation(() => {
        throw new Error(`usó ${name}`);
      });
    }
    try {
      expect(argentinaDate(new Date('2026-11-02T02:59:00Z'))).toMatchObject({ day: 1, weekday: 7 });
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('acepta un ISO con zona, un string o un timestamp', () => {
    const expected = argentinaDate(new Date('2026-11-01T15:00:00Z'));
    expect(argentinaDate('2026-11-01T12:00:00-03:00')).toEqual(expected);
    expect(argentinaDate('2026-11-01T15:00:00Z')).toEqual(expected);
    expect(argentinaDate(Date.parse('2026-11-01T15:00:00Z'))).toEqual(expected);
  });
});

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

describe('dates', () => {
  it('pad completa a dos dígitos', () => {
    expect(pad(5)).toBe('05');
    expect(pad(12)).toBe('12');
  });

  it('todayString da aaaa-mm-dd en hora local', () => {
    expect(todayString(new Date(2026, 0, 9, 23, 59))).toBe('2026-01-09');
  });

  it('localInputValue da aaaa-mm-ddThh:mm en hora local', () => {
    expect(localInputValue(new Date(2026, 9, 5, 8, 7))).toBe('2026-10-05T08:07');
  });

  it('formatDateAR y formatDayMonthAR usan hora argentina en el límite de medianoche', () => {
    expect(formatDateAR('2026-10-31T01:30:00Z')).toBe('30/10/2026');
    expect(formatDayMonthAR('2026-10-31T01:30:00Z')).toBe('30/10');
    expect(formatDateAR('2026-10-31T03:00:00Z')).toBe('31/10/2026');
  });
});
