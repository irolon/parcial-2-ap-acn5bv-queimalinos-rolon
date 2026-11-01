import { describe, expect, it, vi } from 'vitest';
import { argentinaDate, localInputValue, pad, todayString } from '@/utils/dates';

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
});
