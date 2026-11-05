import { describe, expect, it } from 'vitest';
import { gridHours, groupByCell, hourLabel } from '@/utils/agenda';

const availability = [{ weekday: 1, start_time: '09:00', end_time: '12:00' }];
// 10:00 AR = 13:00 UTC; 18:00 AR = 21:00 UTC; 06:00 AR = 09:00 UTC.
const appt = (id, iso, status = 'confirmed') => ({ id, scheduled_at: iso, status });
const at10 = appt('a', '2026-11-02T13:00:00.000Z');
const at10b = appt('b', '2026-11-02T13:00:00.000Z', 'pending');
const cancelled = appt('c', '2026-11-02T21:00:00.000Z', 'cancelled');
const at18 = appt('d', '2026-11-02T21:00:00.000Z');
const at06 = appt('e', '2026-11-02T09:00:00.000Z');

describe('groupByCell', () => {
  it('agrupa los turnos de la misma hora en una celda', () => {
    const cells = groupByCell([at10, at10b], false);
    expect([...cells.keys()]).toEqual(['2026-11-02T10']);
    expect(cells.get('2026-11-02T10')).toEqual([at10, at10b]);
  });

  it('oculta los cancelados salvo que se pidan', () => {
    expect(groupByCell([cancelled], false).size).toBe(0);
    expect(groupByCell([cancelled], true).get('2026-11-02T18')).toEqual([cancelled]);
  });

  it('tolera una lista indefinida', () => {
    expect(groupByCell(undefined, false).size).toBe(0);
  });
});

describe('gridHours', () => {
  it('sin turnos fuera de la disponibilidad usa sus filas', () => {
    expect(gridHours(availability, [at10], false)).toEqual([9, 10, 11]);
  });

  it('agrega filas para los turnos manuales fuera de la disponibilidad', () => {
    expect(gridHours(availability, [at06, at18], false)).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });

  it('un cancelado oculto no amplía la grilla', () => {
    expect(gridHours(availability, [cancelled], false)).toEqual([9, 10, 11]);
    expect(gridHours(availability, [cancelled], true).at(-1)).toBe(18);
  });
});

describe('hourLabel', () => {
  it('formatea la hora en punto con dos dígitos', () => {
    expect(hourLabel(9)).toBe('09:00');
    expect(hourLabel(18)).toBe('18:00');
  });
});
