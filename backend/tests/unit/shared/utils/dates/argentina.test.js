import {
  AR_UTC_OFFSET_H,
  argentinaToUtc,
  utcToArgentina,
  isOnTheHour,
  nextHourUtc,
} from '../../../../../src/shared/utils/dates/argentina.js';
import { localDate } from '../../../../../src/shared/utils/dates/dates.js';

describe('argentinaToUtc', () => {
  it('suma 3 horas', () => {
    expect(argentinaToUtc('2026-11-06', 18).toISOString()).toBe('2026-11-06T21:00:00.000Z');
  });

  it('22:00 de Argentina ya es el día siguiente en UTC', () => {
    expect(argentinaToUtc('2026-11-06', 22).toISOString()).toBe('2026-11-07T01:00:00.000Z');
    expect(argentinaToUtc('2026-12-31', 23).toISOString()).toBe('2027-01-01T02:00:00.000Z');
  });

  it('00:00 de Argentina es 03:00 UTC del mismo día', () => {
    expect(argentinaToUtc('2026-11-02', 0).toISOString()).toBe('2026-11-02T03:00:00.000Z');
  });
});

describe('utcToArgentina', () => {
  it('devuelve día, weekday, hora y minuto de Argentina', () => {
    expect(utcToArgentina('2026-11-06T21:30:00Z')).toEqual({
      date: '2026-11-06',
      weekday: 5,
      hour: 18,
      minute: 30,
    });
  });

  it('01:00 UTC es todavía el día anterior (22:00) en Argentina', () => {
    expect(utcToArgentina('2026-11-07T01:00:00Z')).toMatchObject({ date: '2026-11-06', hour: 22 });
  });

  it('lunes 00:00 AR sigue siendo lunes (weekday 1) y 02:59 UTC es domingo (7)', () => {
    expect(utcToArgentina('2026-11-02T03:00:00Z')).toMatchObject({ date: '2026-11-02', weekday: 1, hour: 0 });
    expect(utcToArgentina('2026-11-02T02:59:59Z')).toMatchObject({ date: '2026-11-01', weekday: 7, hour: 23 });
  });

  it('acepta Date y es la inversa de argentinaToUtc', () => {
    const d = argentinaToUtc('2026-11-02', 0);
    expect(utcToArgentina(d)).toMatchObject({ date: '2026-11-02', hour: 0 });
  });

  it('coincide con localDate (Intl) en los bordes', () => {
    for (const iso of ['2026-11-02T02:59:59Z', '2026-11-02T03:00:00Z', '2026-12-31T23:59:00Z']) {
      expect(utcToArgentina(iso).date).toBe(localDate(iso));
    }
    expect(AR_UTC_OFFSET_H).toBe(3);
  });
});

describe('isOnTheHour', () => {
  it('acepta hora en punto en cualquier formato de zona', () => {
    expect(isOnTheHour('2026-11-06T21:00:00Z')).toBe(true);
    expect(isOnTheHour('2026-11-06T18:00:00-03:00')).toBe(true);
    expect(isOnTheHour(new Date('2026-11-06T21:00:00.000Z'))).toBe(true);
  });

  it('rechaza minutos, segundos, milisegundos y fechas inválidas', () => {
    expect(isOnTheHour('2026-11-06T21:30:00Z')).toBe(false);
    expect(isOnTheHour('2026-11-06T21:00:01Z')).toBe(false);
    expect(isOnTheHour('2026-11-06T21:00:00.500Z')).toBe(false);
    expect(isOnTheHour('basura')).toBe(false);
  });
});

describe('nextHourUtc', () => {
  it('redondea hacia arriba a la próxima hora en punto', () => {
    expect(nextHourUtc(new Date('2026-11-06T21:10:00Z')).toISOString()).toBe('2026-11-06T22:00:00.000Z');
  });

  it('si ya es hora en punto, pasa a la siguiente', () => {
    expect(nextHourUtc(new Date('2026-11-06T21:00:00Z')).toISOString()).toBe('2026-11-06T22:00:00.000Z');
  });
});
