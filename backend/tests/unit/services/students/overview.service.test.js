import { jest } from '@jest/globals';

const mockOverviewRepo = { findActiveStudents: jest.fn(), findFinishedSessionsSince: jest.fn(), findRecentFinished: jest.fn() };
const mockStudentsRepo = { findActiveRoutineSchedules: jest.fn(), findLastSessionDates: jest.fn() };
jest.unstable_mockModule('../../../../src/repositories/students/overview.repository.js', () => mockOverviewRepo);
jest.unstable_mockModule('../../../../src/repositories/students/students.repository/students.repository.js', () => mockStudentsRepo);
const mockOpenRepo = { findOpenSessions: jest.fn() };
jest.unstable_mockModule('../../../../src/repositories/sessions/open-sessions.repository.js', () => mockOpenRepo);

const { overview, RECENT_LIMIT } = await import('../../../../src/services/students/overview.service.js');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: new Date('2026-11-05T16:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
  mockStudentsRepo.findActiveRoutineSchedules.mockResolvedValue(new Map());
  mockStudentsRepo.findLastSessionDates.mockResolvedValue([]);
  mockOverviewRepo.findFinishedSessionsSince.mockResolvedValue([]);
  mockOverviewRepo.findRecentFinished.mockResolvedValue([]);
  mockOpenRepo.findOpenSessions.mockResolvedValue([]);
});
afterEach(() => jest.useRealTimers());

describe('overview.service', () => {
  it('sin alumnos activos no hace más consultas', async () => {
    mockOverviewRepo.findActiveStudents.mockResolvedValue([]);
    const r = await overview('t1');
    expect(r.active_students.count).toBe(0);
    expect(mockOverviewRepo.findFinishedSessionsSince).not.toHaveBeenCalled();
  });

  it('una consulta por lote para cada dato, con la ventana de 30 días en hora argentina', async () => {
    mockOverviewRepo.findActiveStudents.mockResolvedValue([{ id: 'a', name: 'Ana', created_at: '2026-09-01T12:00:00Z' }]);
    mockStudentsRepo.findLastSessionDates.mockResolvedValue([{ student_id: 'a', last_session_at: '2026-10-20T15:00:00Z' }]);
    const r = await overview('t1');
    expect(mockOverviewRepo.findActiveStudents).toHaveBeenCalledWith('t1');
    expect(mockStudentsRepo.findActiveRoutineSchedules).toHaveBeenCalledWith(['a']);
    expect(mockOverviewRepo.findFinishedSessionsSince).toHaveBeenCalledWith(['a'], '2026-10-06T00:00:00-03:00');
    expect(mockOverviewRepo.findRecentFinished).toHaveBeenCalledWith(['a'], RECENT_LIMIT);
    // Abiertas de las últimas 4 h (hoy 05/11 16:00 UTC).
    expect(mockOpenRepo.findOpenSessions).toHaveBeenCalledWith(['a'], '2026-11-05T12:00:00.000Z');
    // Última sesión hace 16 días: en riesgo.
    expect(r.at_risk).toBe(1);
    expect(r.attention[0]).toMatchObject({ kind: 'inactive', student_id: 'a', days: 16 });
  });

  it('una sesión que empezó antes de la ventana y se cerró adentro cuenta en daily, no en la adherencia', async () => {
    // Hoy 05/11: empezó el lunes 05/10 y se cerró el miércoles 07/10 (primera barra del gráfico).
    mockOverviewRepo.findActiveStudents.mockResolvedValue([{ id: 'a', name: 'Ana', created_at: '2026-09-01T12:00:00Z' }]);
    mockStudentsRepo.findActiveRoutineSchedules.mockResolvedValue(
      new Map([['a', { days: ['wednesday'], daySince: new Map([['wednesday', '2026-09-01']]) }]])
    );
    mockOverviewRepo.findFinishedSessionsSince.mockResolvedValue([
      { id: 's1', student_id: 'a', started_at: '2026-10-05T15:00:00Z', finished_at: '2026-10-07T15:00:00Z', trainer_comment: 'ok' },
    ]);
    const r = await overview('t1');
    expect(r.daily[0]).toEqual({ date: '2026-10-07', count: 1 });
    expect(r.daily.reduce((n, d) => n + d.count, 0)).toBe(1);
    // El 05/10 queda fuera de las dos semanas de la adherencia (29/10–04/11 y 22/10–28/10): 0 % en ambas.
    expect(r.adherence_7d).toEqual({ pct: 0, delta: 0 });
  });

  it('una sesión de hace 20 días suma en daily y no en la adherencia, la lista de hoy ni el feedback', async () => {
    // Hoy jueves 05/11; el viernes 16/10 entrenó sin comentario del PT. Tiene asignado el viernes.
    mockOverviewRepo.findActiveStudents.mockResolvedValue([{ id: 'a', name: 'Ana', created_at: '2026-09-01T12:00:00Z' }]);
    mockStudentsRepo.findActiveRoutineSchedules.mockResolvedValue(
      new Map([['a', { days: ['friday'], daySince: new Map([['friday', '2026-09-01']]) }]])
    );
    mockOverviewRepo.findFinishedSessionsSince.mockResolvedValue([
      { id: 's20', student_id: 'a', started_at: '2026-10-16T15:00:00Z', finished_at: '2026-10-16T16:00:00Z', trainer_comment: null },
    ]);
    const r = await overview('t1');
    expect(r.daily.find((d) => d.date === '2026-10-16')).toEqual({ date: '2026-10-16', count: 1 });
    expect(r.daily.reduce((n, d) => n + d.count, 0)).toBe(1);
    // Viernes 30/10 y 23/10 sin entrenar: 0 % en las dos semanas de la adherencia.
    expect(r.adherence_7d).toEqual({ pct: 0, delta: 0 });
    expect(r.lists.students[0].adherence_pct).toBe(0);
    expect(r.sessions_today.done).toBe(0);
    expect(r.lists.today).toEqual([]);
    expect(r.lists.feedback_pending).toEqual([]);
    expect(r.attention.some((a) => a.kind === 'feedback_pending')).toBe(false);
  });

  it('sin alumnos activos: daily con 30 ceros hasta hoy y el resto vacío', async () => {
    mockOverviewRepo.findActiveStudents.mockResolvedValue([]);
    const r = await overview('t1');
    expect(r.daily).toHaveLength(30);
    expect(r.daily.every((d) => d.count === 0)).toBe(true);
    expect(r.daily[0].date).toBe('2026-10-07');
    expect(r.daily.at(-1).date).toBe('2026-11-05');
    expect(r).toMatchObject({
      active_students: { count: 0, new_7d: 0 },
      sessions_today: { done: 0, expected: 0 },
      adherence_7d: { pct: null, delta: null },
      at_risk: 0,
      attention: [],
      recent: [],
      in_session: [],
      lists: { today: [], at_risk: [], feedback_pending: [], students: [] },
    });
    expect(mockOpenRepo.findOpenSessions).not.toHaveBeenCalled();
  });
});
