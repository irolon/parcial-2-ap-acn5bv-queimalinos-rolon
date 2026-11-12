import { DAILY_DAYS, dailySessions } from '../../../../src/models/students/overview-daily.js';

// Hoy: jueves 2026-11-05 (Argentina). La ventana de 30 días va del 07/10 al 05/11.
const TODAY = '2026-11-05';
const session = (id, studentId, startedAt, finishedAt) => ({
  id, student_id: studentId, started_at: startedAt, finished_at: finishedAt,
});
const countOf = (daily, date) => daily.find((d) => d.date === date).count;

describe('models/students/overview-daily', () => {
  it('30 filas de hoy − 29 a hoy, ascendentes, con la forma del contrato', () => {
    const daily = dailySessions([], TODAY);
    expect(DAILY_DAYS).toBe(30);
    expect(daily).toHaveLength(30);
    expect(daily[0]).toEqual({ date: '2026-10-07', count: 0 });
    expect(daily[29]).toEqual({ date: '2026-11-05', count: 0 });
    const dates = daily.map((d) => d.date);
    expect(dates).toEqual([...dates].sort());
    expect(new Set(dates).size).toBe(30);
  });

  it('sin sesiones, todo en 0', () => {
    expect(dailySessions([], TODAY).every((d) => d.count === 0)).toBe(true);
  });

  it('cuenta por el día argentino del fin: empezó ayer 23:30 y terminó hoy 00:20 cuenta hoy', () => {
    // 04/11 23:30 AR → 05/11 00:20 AR (en UTC las dos son del 05/11, 02:30 y 03:20).
    const daily = dailySessions([session('cruce', 'a', '2026-11-05T02:30:00Z', '2026-11-05T03:20:00Z')], TODAY);
    expect(countOf(daily, '2026-11-05')).toBe(1);
    expect(countOf(daily, '2026-11-04')).toBe(0);
  });

  it('terminó 22:00 AR: es de ese día aunque en UTC ya sea el siguiente', () => {
    const daily = dailySessions([session('noche', 'a', '2026-11-04T23:30:00Z', '2026-11-05T01:00:00Z')], TODAY);
    expect(countOf(daily, '2026-11-04')).toBe(1);
    expect(countOf(daily, '2026-11-05')).toBe(0);
  });

  it('dos sesiones del mismo alumno el mismo día suman 2; las de otros alumnos también suman', () => {
    const daily = dailySessions([
      session('1', 'a', '2026-11-03T12:00:00Z', '2026-11-03T13:00:00Z'),
      session('2', 'a', '2026-11-03T18:00:00Z', '2026-11-03T19:00:00Z'),
      session('3', 'b', '2026-11-03T20:00:00Z', '2026-11-03T21:00:00Z'),
    ], TODAY);
    expect(countOf(daily, '2026-11-03')).toBe(3);
    expect(daily.reduce((total, d) => total + d.count, 0)).toBe(3);
  });

  it('las de antes de la ventana no entran (el service trae desde hoy − 30)', () => {
    const daily = dailySessions([
      session('vieja', 'a', '2026-10-06T15:00:00Z', '2026-10-06T16:00:00Z'),
      session('primera', 'a', '2026-10-07T15:00:00Z', '2026-10-07T16:00:00Z'),
    ], TODAY);
    expect(daily.map((d) => d.date)).not.toContain('2026-10-06');
    expect(countOf(daily, '2026-10-07')).toBe(1);
    expect(daily.reduce((total, d) => total + d.count, 0)).toBe(1);
  });

  it('days cambia el largo de la ventana', () => {
    const daily = dailySessions([], TODAY, 7);
    expect(daily.map((d) => d.date)).toEqual([
      '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05',
    ]);
  });
});
