import { describe, expect, it } from 'vitest';
import { currentMonth, eightWeeksRange, monthName, rpeAverage, volumeWindow } from '@/utils/students/commitment';

const session = (startedAt, rpe, finished = true) => ({
  started_at: startedAt,
  finished_at: finished ? startedAt : null,
  rpe,
});

const week = (start, volume) => ({ week_start: start, volume_kg: volume, sessions: volume ? 1 : 0 });

describe('currentMonth', () => {
  it('es el mes en hora argentina: el 1/12 a las 01:00 UTC todavía es noviembre', () => {
    expect(currentMonth(new Date('2026-12-01T01:00:00Z'))).toBe('2026-11');
    expect(currentMonth(new Date('2026-12-01T03:00:00Z'))).toBe('2026-12');
  });
});

describe('monthName', () => {
  it('nombra el mes en minúsculas', () => {
    expect(monthName('2026-11')).toBe('noviembre');
    expect(monthName('2027-01')).toBe('enero');
  });
});

describe('rpeAverage', () => {
  it('promedia el RPE de las sesiones terminadas del mes, a 1 decimal', () => {
    const sessions = [
      session('2026-11-07T20:00:00Z', 8),
      session('2026-11-05T20:00:00Z', 7),
      session('2026-11-03T20:00:00Z', 7),
      session('2026-11-02T20:00:00Z', null),
      session('2026-11-06T20:00:00Z', 9, false),
      session('2026-11-01T02:00:00Z', 10), // 31/10 a las 23:00 en Argentina
      session('2026-10-30T20:00:00Z', 4),
    ];
    expect(rpeAverage(sessions, '2026-11')).toEqual({ average: 7.3, count: 3 });
  });

  it('sin RPE cargado en el mes devuelve null', () => {
    expect(rpeAverage([session('2026-11-02T20:00:00Z', null)], '2026-11')).toBeNull();
    expect(rpeAverage([], '2026-11')).toBeNull();
  });
});

describe('volumeWindow', () => {
  const eight = [1000, 1000, 1000, 1000, 1200, 1000, 1000, 1160].map((v, i) => week(`w${i}`, v));

  it('suma las 4 últimas semanas y las compara con las 4 anteriores', () => {
    expect(volumeWindow(eight)).toEqual({ total: 4360, deltaPct: 9 });
    const lower = [...eight.slice(0, 4), ...[500, 500, 500, 500].map((v) => week('x', v))];
    expect(volumeWindow(lower)).toEqual({ total: 2000, deltaPct: -50 });
  });

  it('sin volumen en las 4 semanas anteriores no hay variación', () => {
    expect(volumeWindow(eight.slice(4))).toEqual({ total: 4360, deltaPct: null });
    const zeros = [0, 0, 0, 0, 100, 0, 0, 0].map((v) => week('x', v));
    expect(volumeWindow(zeros)).toEqual({ total: 100, deltaPct: null });
    expect(volumeWindow([])).toEqual({ total: 0, deltaPct: null });
  });
});

describe('eightWeeksRange', () => {
  it('va del lunes de hace 7 semanas a hoy, en hora argentina', () => {
    expect(eightWeeksRange(new Date('2026-11-08T15:00:00Z'))).toEqual({ from: '2026-09-14', to: '2026-11-08' });
    expect(eightWeeksRange(new Date('2026-11-09T02:00:00Z'))).toEqual({ from: '2026-09-14', to: '2026-11-08' });
    expect(eightWeeksRange(new Date('2026-11-09T12:00:00Z'))).toEqual({ from: '2026-09-21', to: '2026-11-09' });
  });
});
