import { describe, expect, it } from 'vitest';
import {
  attendanceTitle, calendarCells, canGoNext, canGoPrev, dayLabel, firstMonth, isoDay, shiftMonth,
} from '@/utils/students/attendanceCalendar';

describe('calendarCells', () => {
  it('la semana empieza el lunes: noviembre 2026 empieza domingo y deja 6 huecos', () => {
    const cells = calendarCells('2026-11', [{ date: '2026-11-01', status: 'trained' }]);
    expect(cells.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(cells[6]).toEqual({ day: 1, date: '2026-11-01', status: 'trained' });
    expect(cells.filter(Boolean)).toHaveLength(30);
  });

  it('febrero 2027 tiene 28 días y el día sin dato queda sin estado', () => {
    const cells = calendarCells('2027-02', []).filter(Boolean);
    expect(cells).toHaveLength(28);
    expect(cells.at(-1)).toEqual({ day: 28, date: '2027-02-28', status: null });
    expect(calendarCells('2027-02', [])[0]).toEqual({ day: 1, date: '2027-02-01', status: null });
  });
});

describe('meses', () => {
  it('shiftMonth cruza el año para los dos lados', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
    expect(shiftMonth('2026-11', -3)).toBe('2026-08');
  });

  it('el piso es el mes del alta en hora argentina, nunca antes de 2020-01 ni después del actual', () => {
    expect(firstMonth('2026-03-15T12:00:00Z', '2026-11')).toBe('2026-03');
    expect(firstMonth('2026-04-01T02:00:00Z', '2026-11')).toBe('2026-03');
    expect(firstMonth('2018-05-01T12:00:00Z', '2026-11')).toBe('2020-01');
    expect(firstMonth('2027-01-01T12:00:00Z', '2026-11')).toBe('2026-11');
    expect(firstMonth(undefined, '2026-11')).toBe('2026-11');
  });

  it('se puede ir atrás hasta el piso y adelante hasta el actual', () => {
    expect(canGoPrev('2026-11', '2026-11')).toBe(false);
    expect(canGoPrev('2026-11', '2026-10')).toBe(true);
    expect(canGoNext('2026-11', '2026-11')).toBe(false);
    expect(canGoNext('2026-10', '2026-11')).toBe(true);
  });
});

describe('textos', () => {
  it('el título lleva el año solo si no es el del mes actual', () => {
    expect(attendanceTitle('2026-11', '2026-11')).toBe('Asistencia · noviembre');
    expect(attendanceTitle('2025-10', '2026-11')).toBe('Asistencia · octubre 2025');
  });

  it('cada estado tiene su texto', () => {
    expect(['trained', 'missed', 'rest', 'upcoming'].map(dayLabel)).toEqual(['entrenó', 'faltó', 'descanso', 'por venir']);
    expect(dayLabel(null)).toBe('sin datos');
  });

  it('isoDay da el día en hora argentina', () => {
    expect(isoDay(new Date('2026-11-10T02:00:00Z'))).toBe('2026-11-09');
  });
});
