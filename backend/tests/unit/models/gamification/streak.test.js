import { addDays, weekdayOf, computeStreak } from '../../../../src/models/gamification/streak.js';

// 2026-10-26 es lunes; 2026-10-30 es viernes.
const run = (trainedDates, assignedDays, today) =>
  computeStreak({ trainedDates, assignedDays, today });
const MWF = ['monday', 'wednesday', 'friday'];

describe('helpers de fecha', () => {
  it('addDays cruza meses y años', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('weekdayOf devuelve el nombre en inglés', () => {
    expect(weekdayOf('2026-10-26')).toBe('monday');
    expect(weekdayOf('2026-11-01')).toBe('sunday');
  });
});

describe('computeStreak', () => {
  it('sin sesiones, todo en cero', () => {
    expect(run([], MWF, '2026-10-30')).toEqual({
      current_days: 0,
      longest_days: 0,
      last_trained_date: null,
    });
  });

  it('hoy entrenado suma', () => {
    expect(run(['2026-10-30'], [], '2026-10-30').current_days).toBe(1);
  });

  it('hoy asignado y sin entrenar no corta (todavía no terminó)', () => {
    const r = run(['2026-10-26', '2026-10-28'], MWF, '2026-10-30');
    expect(r.current_days).toBe(2);
    expect(r.last_trained_date).toBe('2026-10-28');
  });

  it('un día asignado sin entrenar corta', () => {
    // viernes 30 hoy; miércoles 28 asignado y no entrenado
    const r = run(['2026-10-26', '2026-10-30'], MWF, '2026-10-30');
    expect(r.current_days).toBe(1);
    expect(r.longest_days).toBe(1);
  });

  it('los días no asignados sin entrenar no cortan', () => {
    // lun, mié, vie entrenados; martes y jueves no asignados
    const r = run(['2026-10-26', '2026-10-28', '2026-10-30'], MWF, '2026-10-30');
    expect(r.current_days).toBe(3);
  });

  it('un día no asignado entrenado suma 1', () => {
    const r = run(['2026-10-26', '2026-10-27', '2026-10-28'], MWF, '2026-10-28');
    expect(r.current_days).toBe(3);
  });

  it('sin rutina activa todos los días son asignados', () => {
    const r = run(['2026-10-26', '2026-10-28', '2026-10-29'], [], '2026-10-29');
    expect(r.current_days).toBe(2);
    expect(r.longest_days).toBe(2);
  });

  it('longest_days conserva la mejor racha aunque se haya cortado', () => {
    const dates = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-30'];
    const r = run(dates, [], '2026-10-30');
    expect(r.longest_days).toBe(4);
    expect(r.current_days).toBe(1);
    expect(r.last_trained_date).toBe('2026-10-30');
  });

  it('racha rota: ayer asignado sin entrenar y hoy sin entrenar da 0', () => {
    const r = run(['2026-10-27'], [], '2026-10-30');
    expect(r.current_days).toBe(0);
    expect(r.longest_days).toBe(1);
  });

  it('ignora fechas posteriores a hoy', () => {
    const r = run(['2026-10-30', '2026-11-05'], [], '2026-10-30');
    expect(r.current_days).toBe(1);
    expect(r.last_trained_date).toBe('2026-10-30');
  });

  it('con varios días asignados (unión de rutinas) cuenta todos', () => {
    const assigned = ['monday', 'tuesday', 'wednesday'];
    const r = run(['2026-10-26', '2026-10-27', '2026-10-28'], assigned, '2026-10-28');
    expect(r.current_days).toBe(3);
  });
});
