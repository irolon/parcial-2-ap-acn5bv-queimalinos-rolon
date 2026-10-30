import { missedAssignedDays } from '../../../../../src/models/gamification/streak.js';

const MWF = ['monday', 'wednesday', 'friday'];
const missed = (lastDate, assignedDays, today) =>
  missedAssignedDays({ lastDate, assignedDays, today });

describe('missedAssignedDays', () => {
  // 2026-10-19 es lunes.
  it('cuenta solo los días asignados entre lastDate (excluido) y hoy (excluido)', () => {
    // 20 mar, 21 mié, 22 jue, 23 vie, 24 sáb, 25 dom, 26 lun → mié, vie, lun
    expect(missed('2026-10-19', MWF, '2026-10-27')).toBe(3);
  });

  it('hoy no cuenta', () => {
    expect(missed('2026-10-19', MWF, '2026-10-21')).toBe(0);
    expect(missed('2026-10-19', MWF, '2026-10-22')).toBe(1);
  });

  it('el día de lastDate no cuenta', () => {
    expect(missed('2026-10-21', MWF, '2026-10-23')).toBe(0);
  });

  it('assignedDays vacío o ausente cuenta todos los días', () => {
    expect(missed('2026-10-19', [], '2026-10-27')).toBe(7);
    expect(missed('2026-10-19', undefined, '2026-10-27')).toBe(7);
  });

  it('lastDate igual o posterior a hoy da 0', () => {
    expect(missed('2026-10-27', [], '2026-10-27')).toBe(0);
    expect(missed('2026-10-28', [], '2026-10-27')).toBe(0);
  });

  it('10 días sin entrenar con rutina de 3 días por semana', () => {
    expect(missed('2026-10-19', MWF, '2026-10-29')).toBe(4);
  });
});
