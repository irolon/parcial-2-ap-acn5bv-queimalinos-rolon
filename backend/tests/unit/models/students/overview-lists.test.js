import { feedbackList, riskList, studentsList, todayList } from '../../../../src/models/students/overview-lists.js';

// Hoy: jueves 2026-11-05 (Argentina).
const TODAY = '2026-11-05';
const at = (day, hour = 15) => `2026-${day}T${String(hour).padStart(2, '0')}:00:00Z`;
const student = (id, extra = {}) => ({
  id, name: `Alumno ${id}`, active: true, created_at: at('09-01'), last_session_at: at('11-04'), ...extra,
});
const session = (id, studentId, day, extra = {}) => ({
  id, student_id: studentId, started_at: at(day), finished_at: at(day, 16), rpe: 8, trainer_comment: null, routine_name: 'Push', ...extra,
});

describe('models/students/overview-lists', () => {
  describe('todayList', () => {
    it('pendientes por nombre, después terminados del más reciente; suma al que entrenó sin tenerlo asignado', () => {
      const students = [student('c'), student('b'), student('a'), student('x'), student('d')];
      const routineDays = new Map([['a', ['thursday']], ['b', ['thursday']], ['c', ['thursday']], ['d', ['monday']]]);
      const sessions = [
        session('s-a', 'a', '11-05', { finished_at: at('11-05', 12) }),
        session('s-d', 'd', '11-05', { finished_at: at('11-05', 18), rpe: null }),
        session('viejo', 'b', '11-04'),
      ];
      const r = todayList(students, routineDays, sessions, TODAY);
      expect(r.map((x) => [x.student_id, x.status, x.planned])).toEqual([
        ['b', 'pending', true], ['c', 'pending', true], ['d', 'done', false], ['a', 'done', true],
      ]);
      expect(r[0]).toEqual({
        student_id: 'b', name: 'Alumno b', planned: true, status: 'pending', session_id: null, routine_name: null, finished_at: null, rpe: null,
      });
      expect(r[2]).toMatchObject({ session_id: 's-d', routine_name: 'Push', finished_at: at('11-05', 18), rpe: null });
    });

    it('con dos sesiones hoy muestra la última; cuenta por la hora de fin', () => {
      const sessions = [
        session('primera', 'a', '11-05', { finished_at: at('11-05', 11) }),
        session('segunda', 'a', '11-05', { finished_at: at('11-05', 20) }),
        // Empezó ayer 23:30 AR y terminó hoy 00:30 AR.
        session('cruce', 'b', '11-05', { started_at: '2026-11-05T02:30:00Z', finished_at: '2026-11-05T03:30:00Z' }),
      ];
      const r = todayList([student('a'), student('b')], new Map(), sessions, TODAY);
      expect(r.map((x) => x.session_id)).toEqual(['segunda', 'cruce']);
    });

    it('nadie con hoy asignado ni entrenado: lista vacía', () => {
      expect(todayList([student('a')], new Map([['a', ['monday']]]), [], TODAY)).toEqual([]);
    });
  });

  it('riskList: de más días a menos, sin tope y marcando a quien nunca entrenó', () => {
    const students = [
      student('r1', { last_session_at: at('10-27') }),
      student('r2', { last_session_at: null, created_at: at('10-01') }),
      student('ok'),
      student('nuevo', { last_session_at: null, created_at: at('11-03') }),
    ];
    expect(riskList(students, TODAY)).toEqual([
      { student_id: 'r2', name: 'Alumno r2', days: 35, never_trained: true },
      { student_id: 'r1', name: 'Alumno r1', days: 9, never_trained: false },
    ]);
  });

  it('feedbackList: últimos 7 días sin comentar, de la más nueva a la más vieja, con rpe y sin tope', () => {
    const names = new Map([['a', 'Ana']]);
    const sessions = [
      ...Array.from({ length: 12 }, (_, i) => session(`p${i}`, 'a', `10-${30 + (i % 2)}`, { finished_at: at(`10-${30 + (i % 2)}`, 8 + i) })),
      session('comentada', 'a', '11-04', { trainer_comment: 'Bien' }),
      session('vieja', 'a', '10-29'),
    ];
    const r = feedbackList(sessions, names, TODAY);
    expect(r).toHaveLength(12);
    expect(r.map((f) => f.finished_at)).toEqual([...r.map((f) => f.finished_at)].sort().reverse());
    expect(r[0]).toEqual({ student_id: 'a', name: 'Ana', session_id: 'p11', routine_name: 'Push', finished_at: at('10-31', 19), rpe: 8 });
  });

  it('studentsList: por nombre, con estado, días sin entrenar y adherencia (null sin plan)', () => {
    const students = [student('b', { name: 'Zoe' }), student('a', { name: 'Álvaro', last_session_at: at('10-20') })];
    // Zoe: lun/mié/vie; semana 29/10-04/11 → 30/10, 02/11 y 04/11; entrenó 02/11 → 33%.
    const routineDays = new Map([['b', ['monday', 'wednesday', 'friday']]]);
    const dates = new Map([['b', ['2026-11-02']]]);
    expect(studentsList(students, routineDays, dates, TODAY)).toEqual([
      { student_id: 'a', name: 'Álvaro', status: 'inactive', days_without_training: 16, adherence_pct: null },
      { student_id: 'b', name: 'Zoe', status: 'active', days_without_training: 1, adherence_pct: 33 },
    ]);
  });

  it('studentsList: la adherencia usa los pisos de alta y rutina', () => {
    const mwf = ['monday', 'wednesday', 'friday'];
    // Alta el 03/11: solo cuenta el 04/11 (entrenó) → 100, no 33.
    const nueva = student('n', { name: 'Nueva', created_at: at('11-03') });
    // Alta vieja, rutina desde el 01/11: cuentan 02/11 y 04/11; entrenó el 02 → 50.
    const vieja = student('v', { name: 'Vieja' });
    const r = studentsList(
      [nueva, vieja],
      new Map([['n', mwf], ['v', mwf]]),
      new Map([['n', ['2026-11-04']], ['v', ['2026-11-02']]]),
      TODAY,
      new Map([['v', new Map(mwf.map((d) => [d, '2026-11-01']))]]),
    );
    expect(r.map((x) => x.adherence_pct)).toEqual([100, 50]);
  });
});
