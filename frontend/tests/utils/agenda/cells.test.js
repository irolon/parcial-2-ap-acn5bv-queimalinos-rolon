import { describe, expect, it } from 'vitest';
import { appointmentCell, hourRange, isAvailable, slotIso, slotKey, timeRangeLabel } from '@/utils/agenda';

const availability = [
  { weekday: 1, start_time: '09:00', end_time: '13:00' },
  { weekday: 4, start_time: '16:00', end_time: '20:00' },
];

describe('hourRange', () => {
  it('sin disponibilidad va de 8 a 20 (filas 08 a 21)', () => {
    const hours = hourRange([]);
    expect(hours[0]).toBe(8);
    expect(hours.at(-1)).toBe(20);
    expect(hours).toHaveLength(13);
    expect(hourRange(undefined)).toEqual(hours);
  });

  it('va de la menor start_time a la mayor end_time - 1', () => {
    expect(hourRange(availability)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  });

  it('con una sola franja', () => {
    expect(hourRange([{ weekday: 2, start_time: '07:00', end_time: '09:00' }])).toEqual([7, 8]);
  });
});

describe('isAvailable', () => {
  it('incluye el inicio y excluye el fin de la franja', () => {
    expect(isAvailable(availability, 1, 9)).toBe(true);
    expect(isAvailable(availability, 1, 12)).toBe(true);
    expect(isAvailable(availability, 1, 13)).toBe(false);
    expect(isAvailable(availability, 1, 8)).toBe(false);
  });

  it('distingue el día y tolera disponibilidad vacía', () => {
    expect(isAvailable(availability, 2, 10)).toBe(false);
    expect(isAvailable(availability, 4, 17)).toBe(true);
    expect(isAvailable([], 1, 10)).toBe(false);
  });
});

describe('appointmentCell', () => {
  it('2026-11-07T01:00Z es viernes 06/11 a las 22 en Argentina', () => {
    expect(appointmentCell({ scheduled_at: '2026-11-07T01:00:00.000Z' })).toEqual({ date: '2026-11-06', hour: 22 });
  });

  it('2026-11-02T03:00Z es lunes 02/11 a las 0', () => {
    expect(appointmentCell({ scheduled_at: '2026-11-02T03:00:00.000Z' })).toEqual({ date: '2026-11-02', hour: 0 });
  });

  it('2026-11-02T02:00Z sigue siendo domingo 01/11 a las 23', () => {
    expect(appointmentCell({ scheduled_at: '2026-11-02T02:00:00.000Z' })).toEqual({ date: '2026-11-01', hour: 23 });
  });
});

describe('timeRangeLabel', () => {
  it('formatea día, fecha y rango de una hora', () => {
    expect(timeRangeLabel('2026-11-05T21:00:00.000Z')).toBe('Jue 05/11 · 18:00–19:00');
    expect(timeRangeLabel('2026-11-06T21:00:00.000Z')).toBe('Vie 06/11 · 18:00–19:00');
  });

  it('en el borde de medianoche pasa a las 00:00', () => {
    expect(timeRangeLabel('2026-11-07T02:00:00.000Z')).toBe('Vie 06/11 · 23:00–00:00');
    expect(timeRangeLabel('2026-11-02T03:00:00.000Z')).toBe('Lun 02/11 · 00:00–01:00');
  });
});

describe('slotIso / slotKey', () => {
  it('slotIso convierte la hora de Argentina a UTC (y ida y vuelta con appointmentCell)', () => {
    expect(slotIso('2026-11-06', 18)).toBe('2026-11-06T21:00:00.000Z');
    expect(slotIso('2026-11-06', 22)).toBe('2026-11-07T01:00:00.000Z');
    expect(appointmentCell({ scheduled_at: slotIso('2026-11-06', 22) })).toEqual({ date: '2026-11-06', hour: 22 });
  });

  it('slotKey es estable', () => {
    expect(slotKey('2026-11-06', 9)).toBe('2026-11-06T09');
  });
});
