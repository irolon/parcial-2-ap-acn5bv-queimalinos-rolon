import { adherence7d, daysPerWeek } from '../../../../src/models/students/adherence.js';

// Jueves 2026-11-05: la ventana va del jueves 29/10 al miércoles 04/11.
const TODAY = '2026-11-05';
const MWF = ['monday', 'wednesday', 'friday'];

describe('models/students/adherence', () => {
  it('sin días asignados (sin rutina) → pct null', () => {
    expect(adherence7d({ assignedDays: [], finishedDates: ['2026-11-02'], today: TODAY })).toEqual({
      assigned: 0,
      done: 0,
      pct: null,
    });
  });

  it('lun/mié/vie con hoy jueves → 3 días asignados en la ventana', () => {
    expect(adherence7d({ assignedDays: MWF, finishedDates: [], today: TODAY })).toEqual({
      assigned: 3,
      done: 0,
      pct: 0,
    });
  });

  it('entrenó lunes y viernes → 2 de 3 = 67 %', () => {
    const r = adherence7d({
      assignedDays: MWF,
      finishedDates: ['2026-10-30', '2026-11-02'],
      today: TODAY,
    });
    expect(r).toEqual({ assigned: 3, done: 2, pct: 67 });
  });

  it('una sesión de hoy no cuenta (hoy no terminó)', () => {
    const r = adherence7d({ assignedDays: ['thursday'], finishedDates: [TODAY], today: TODAY });
    expect(r).toEqual({ assigned: 1, done: 0, pct: 0 });
  });

  it('entrenar un día no asignado no suma', () => {
    const r = adherence7d({ assignedDays: MWF, finishedDates: ['2026-11-03'], today: TODAY });
    expect(r.done).toBe(0);
  });

  it('dos sesiones el mismo día cuentan una vez', () => {
    const r = adherence7d({
      assignedDays: MWF,
      finishedDates: ['2026-11-02', '2026-11-02'],
      today: TODAY,
    });
    expect(r.done).toBe(1);
  });

  it('fuera de la ventana (hace 8 días) no cuenta', () => {
    const r = adherence7d({ assignedDays: ['wednesday'], finishedDates: ['2026-10-28'], today: TODAY });
    expect(r).toEqual({ assigned: 1, done: 0, pct: 0 });
  });

  it('daysPerWeek cuenta los días distintos', () => {
    expect(daysPerWeek(MWF)).toBe(3);
    expect(daysPerWeek(['monday', 'monday'])).toBe(1);
    expect(daysPerWeek([])).toBe(0);
  });
});
