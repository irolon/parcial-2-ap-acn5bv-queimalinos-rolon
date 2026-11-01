import { buildAttendance, monthRange } from '../../../../src/models/students/attendance.js';

const MWF = ['monday', 'wednesday', 'friday'];
const statusOf = (r, date) => r.days.find((d) => d.date === date).status;

describe('models/students/attendance', () => {
  it('mes pasado completo: trained, missed y rest; assigned_days es todo el mes', () => {
    // Octubre 2026: el 1 es jueves. Lunes 5, miércoles 7 y viernes 9 asignados.
    const r = buildAttendance({
      month: '2026-10',
      today: '2026-11-05',
      assignedDays: MWF,
      sessions: [{ id: 's1', date: '2026-10-05' }, { id: 's2', date: '2026-10-10' }],
      recordSessionIds: ['s2'],
    });
    expect(r.days).toHaveLength(31);
    expect(statusOf(r, '2026-10-05')).toBe('trained');
    expect(statusOf(r, '2026-10-07')).toBe('missed');
    expect(statusOf(r, '2026-10-06')).toBe('rest');
    // Entrenar un día no asignado (sábado 10) cuenta como trained.
    expect(statusOf(r, '2026-10-10')).toBe('trained');
    expect(r.sessions).toBe(2);
    expect(r.assigned_days).toBe(13);
    expect(r.prs).toBe(1);
  });

  it('mes actual: hoy entrenado es trained, hoy sin entrenar y lo futuro es upcoming', () => {
    const base = { month: '2026-11', today: '2026-11-04', assignedDays: MWF, recordSessionIds: [] };
    const trainedToday = buildAttendance({ ...base, sessions: [{ id: 's', date: '2026-11-04' }] });
    expect(statusOf(trainedToday, '2026-11-04')).toBe('trained');
    const notYet = buildAttendance({ ...base, sessions: [] });
    expect(statusOf(notYet, '2026-11-04')).toBe('upcoming');
    expect(statusOf(notYet, '2026-11-06')).toBe('upcoming');
    expect(statusOf(notYet, '2026-11-02')).toBe('missed');
    // Asignados hasta hoy inclusive: lunes 2 y miércoles 4.
    expect(notYet.assigned_days).toBe(2);
  });

  it('sin rutina: los días pasados son rest y no hay asignados', () => {
    const r = buildAttendance({ month: '2026-11', today: '2026-11-10', assignedDays: [], sessions: [], recordSessionIds: [] });
    expect(statusOf(r, '2026-11-02')).toBe('rest');
    expect(r.assigned_days).toBe(0);
    expect(r.sessions).toBe(0);
  });

  it('febrero de un año bisiesto tiene 29 días y diciembre pasa al año siguiente', () => {
    const r = buildAttendance({ month: '2028-02', today: '2028-03-10', assignedDays: [], sessions: [], recordSessionIds: [] });
    expect(r.days).toHaveLength(29);
    expect(monthRange('2026-12')).toEqual({ first: '2026-12-01', next: '2027-01-01' });
    expect(monthRange('2027-02').next).toBe('2027-03-01');
    // El año conserva los 4 dígitos, también con ceros adelante y al pasar de año.
    expect(monthRange('0999-01')).toEqual({ first: '0999-01-01', next: '0999-02-01' });
    expect(monthRange('0999-12').next).toBe('1000-01-01');
  });

  it('dos sesiones el mismo día cuentan las dos como sesiones y el día una vez', () => {
    const r = buildAttendance({
      month: '2026-11', today: '2026-11-10', assignedDays: MWF,
      sessions: [{ id: 'a', date: '2026-11-02' }, { id: 'b', date: '2026-11-02' }],
      recordSessionIds: ['a', 'b'],
    });
    expect(r.sessions).toBe(2);
    expect(r.prs).toBe(2);
    expect(r.days.filter((d) => d.status === 'trained')).toHaveLength(1);
  });
});
