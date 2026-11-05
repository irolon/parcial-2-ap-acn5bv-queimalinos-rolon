import { describe, expect, it } from 'vitest';
import { shiftWeek, weekOf, weekTitle } from '@/utils/agenda';

describe('weekOf', () => {
  it('2026-11-02T03:00Z es lunes 02/11 00:00 en Argentina: abre la semana del 2 al 8', () => {
    const week = weekOf('2026-11-02T03:00:00Z');
    expect(week.from).toBe('2026-11-02');
    expect(week.to).toBe('2026-11-08');
  });

  it('2026-11-02T02:59Z todavía es domingo 01/11 en Argentina: cae en la semana anterior', () => {
    const week = weekOf('2026-11-02T02:59:00Z');
    expect(week).toMatchObject({ from: '2026-10-26', to: '2026-11-01' });
    expect(week.days[6].date).toBe('2026-11-01');
  });

  it('2026-11-07T01:00Z es viernes 06/11 22:00 en Argentina (misma semana, no el sábado)', () => {
    expect(weekOf('2026-11-07T01:00:00Z').from).toBe('2026-11-02');
  });

  it('arma siete días con weekday 1-7 y etiqueta LUN 03', () => {
    const { days } = weekOf(new Date('2026-11-05T15:00:00Z'));
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(days[0]).toMatchObject({ date: '2026-11-02', label: 'LUN 02' });
    expect(days[2].label).toBe('MIÉ 04');
    expect(days[5].label).toBe('SÁB 07');
  });

  it('isToday se calcula en Argentina, no en la zona del navegador', () => {
    const now = new Date('2026-11-02T02:30:00Z'); // domingo 01/11 23:30 en AR
    const today = weekOf(now, now).days.filter((d) => d.isToday);
    expect(today.map((d) => d.date)).toEqual(['2026-11-01']);
  });

  it('isToday queda en false si hoy no está en la semana', () => {
    expect(weekOf('2026-11-05T12:00:00Z', new Date('2026-12-25T12:00:00Z')).days.some((d) => d.isToday)).toBe(false);
  });

  it('cruza de año', () => {
    expect(weekOf('2026-12-31T12:00:00Z')).toMatchObject({ from: '2026-12-28', to: '2027-01-03' });
  });
});

describe('shiftWeek', () => {
  it('suma y resta semanas, también entre meses y años', () => {
    expect(shiftWeek('2026-11-02', 1)).toBe('2026-11-09');
    expect(shiftWeek('2026-11-02', -1)).toBe('2026-10-26');
    expect(shiftWeek('2026-12-28', 1)).toBe('2027-01-04');
    expect(shiftWeek('2026-11-02', 0)).toBe('2026-11-02');
  });
});

describe('weekTitle', () => {
  it('semana dentro de un mes', () => {
    expect(weekTitle('2026-11-02', '2026-11-08')).toBe('SEMANA DEL 2 AL 8 NOV');
    expect(weekTitle('2026-11-09', '2026-11-15')).toBe('SEMANA DEL 9 AL 15 NOV');
  });

  it('semana que cruza de mes', () => {
    expect(weekTitle('2026-10-26', '2026-11-01')).toBe('SEMANA DEL 26 OCT AL 1 NOV');
  });
});
