import { scheduleOf, adherence7d, daysPerWeek } from '../../../../src/models/students/adherence.js';

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

describe('adherence7d con pisos (alta y rutina)', () => {
  // Jueves 05/11; ventana 29/10-04/11; L/X/V asignados: 30/10, 02/11 y 04/11.
  const base = { assignedDays: ['monday', 'wednesday', 'friday'], finishedDates: ['2026-11-04'], today: '2026-11-05' };

  it('sin pisos cuentan los tres días', () => {
    expect(adherence7d(base)).toEqual({ assigned: 3, done: 1, pct: 33 });
  });

  it('el alta a mitad de ventana descarta los días anteriores', () => {
    expect(adherence7d({ ...base, since: '2026-11-02' })).toEqual({ assigned: 2, done: 1, pct: 50 });
  });

  it('la fecha de la rutina se aplica por día de la semana', () => {
    const daySince = new Map([['monday', '2026-11-03'], ['wednesday', '2026-11-03'], ['friday', '2026-10-01']]);
    expect(adherence7d({ ...base, daySince })).toEqual({ assigned: 2, done: 1, pct: 50 });
  });

  it('si no queda ningún día asignado es sin plan (null), no 0 %', () => {
    expect(adherence7d({ ...base, finishedDates: [], since: '2026-11-05' })).toEqual({ assigned: 0, done: 0, pct: null });
  });
});

describe('scheduleOf', () => {
  it('une los días y se queda con la fecha más vieja de cada uno', () => {
    const s = scheduleOf([
      { days: ['monday', 'friday'], since: '2026-10-20' },
      { days: ['friday'], since: '2026-10-01' },
    ]);
    expect(s.days.sort()).toEqual(['friday', 'monday']);
    expect(Object.fromEntries(s.daySince)).toEqual({ monday: '2026-10-20', friday: '2026-10-01' });
  });
});
