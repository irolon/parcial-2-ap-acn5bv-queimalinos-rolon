import { buildOverview } from '../../../../src/models/students/overview.js';

// Hoy: jueves 2026-11-05 (Argentina).
const TODAY = '2026-11-05';
const at = (day, hour = 15) => `2026-${day}T${String(hour).padStart(2, '0')}:00:00Z`;
const student = (id, extra = {}) => ({
  id, name: `Alumno ${id}`, active: true, created_at: at('09-01'), last_session_at: at('11-04'), ...extra,
});
const session = (id, studentId, day, extra = {}) => ({
  id, student_id: studentId, started_at: at(day), finished_at: at(day, 16), rpe: 8, trainer_comment: null, routine_name: 'Push', ...extra,
});
const base = { routineDays: new Map(), sessions: [], recent: [], today: TODAY };

describe('models/students/overview', () => {
  it('sin alumnos: todo en 0, adherencia null y listas vacías', () => {
    const r = buildOverview({ ...base, students: [] });
    expect(r).toEqual({
      active_students: { count: 0, new_7d: 0 },
      sessions_today: { done: 0, expected: 0 },
      adherence_7d: { pct: null, delta: null },
      at_risk: 0,
      attention: [],
      recent: [],
    });
  });

  it('alumnos activos y altas de los últimos 7 días', () => {
    const r = buildOverview({ ...base, students: [student('a'), student('b', { created_at: at('10-30') }), student('c', { created_at: at('10-29') })] });
    expect(r.active_students).toEqual({ count: 3, new_7d: 1 });
  });

  it('sesiones de hoy: done cuenta aunque hoy no esté asignado; expected solo los que tienen hoy', () => {
    const r = buildOverview({
      ...base,
      students: [student('a'), student('b')],
      routineDays: new Map([['a', ['thursday']], ['b', ['monday']]]),
      sessions: [session('s1', 'b', '11-05')],
    });
    expect(r.sessions_today).toEqual({ done: 1, expected: 1 });
  });

  it('sesiones de hoy cuentan por la hora de fin: empezó ayer a las 23:30 y terminó hoy a las 00:30', () => {
    const r = buildOverview({
      ...base,
      students: [student('a'), student('b')],
      sessions: [
        // 04/11 23:30 AR → 05/11 00:30 AR.
        session('cruce', 'a', '11-05', { started_at: '2026-11-05T02:30:00Z', finished_at: '2026-11-05T03:30:00Z' }),
        // Empezó y terminó ayer.
        session('ayer', 'b', '11-04'),
      ],
    });
    expect(r.sessions_today.done).toBe(1);
  });

  it('adherencia: promedio de los que tienen plan y variación contra la semana anterior', () => {
    // a: lun/mié/vie. Semana actual (29/10-04/11): 30/10, 02/11 y 04/11 asignados, entrenó 2 → 67.
    // Semana anterior (22/10-28/10): 23/10, 26/10 y 28/10 asignados, entrenó 1 → 33. b sin plan no cuenta.
    const r = buildOverview({
      ...base,
      students: [student('a'), student('b')],
      routineDays: new Map([['a', ['monday', 'wednesday', 'friday']]]),
      sessions: [session('1', 'a', '10-30'), session('2', 'a', '11-02'), session('3', 'a', '10-26')],
    });
    expect(r.adherence_7d).toEqual({ pct: 67, delta: 34 });
  });

  it('atención: en riesgo de más días a menos, después avisos del más nuevo, con tope de 10', () => {
    const students = [
      student('r1', { last_session_at: at('10-27') }),
      student('r2', { last_session_at: null, created_at: at('10-01') }),
      student('ok'),
    ];
    const sessions = Array.from({ length: 12 }, (_, i) => session(`p${i}`, 'ok', `11-0${(i % 5) + 1}`, { finished_at: at(`11-0${(i % 5) + 1}`, 10 + i) }));
    const r = buildOverview({ ...base, students, sessions });
    expect(r.attention).toHaveLength(10);
    expect(r.attention.slice(0, 2)).toEqual([
      { kind: 'inactive', student_id: 'r2', name: 'Alumno r2', days: 35, never_trained: true },
      { kind: 'inactive', student_id: 'r1', name: 'Alumno r1', days: 9, never_trained: false },
    ]);
    const pending = r.attention.slice(2).map((a) => a.finished_at);
    expect(pending).toEqual([...pending].sort().reverse());
    expect(r.at_risk).toBe(2);
  });

  it('una sesión comentada o de hace más de 7 días no es aviso', () => {
    const r = buildOverview({
      ...base,
      students: [student('a')],
      sessions: [session('c', 'a', '11-04', { trainer_comment: 'Bien' }), session('v', 'a', '10-29')],
    });
    expect(r.attention).toEqual([]);
  });

  it('actividad reciente con el nombre y rpe null', () => {
    const r = buildOverview({ ...base, students: [student('a')], recent: [session('x', 'a', '11-05', { rpe: null })] });
    expect(r.recent).toEqual([
      { student_id: 'a', name: 'Alumno a', session_id: 'x', routine_name: 'Push', rpe: null, finished_at: at('11-05', 16) },
    ]);
  });
});
