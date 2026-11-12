import { jest } from '@jest/globals';

const mockOverviewRepo = { findActiveStudents: jest.fn(), findFinishedSessionsSince: jest.fn(), findRecentFinished: jest.fn() };
const mockStudentsRepo = { findActiveRoutineSchedules: jest.fn(), findLastSessionDates: jest.fn() };
jest.unstable_mockModule('../../../../src/repositories/students/overview.repository.js', () => mockOverviewRepo);
jest.unstable_mockModule('../../../../src/repositories/students/students.repository/students.repository.js', () => mockStudentsRepo);

const { overview, RECENT_LIMIT } = await import('../../../../src/services/students/overview.service.js');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: new Date('2026-11-05T16:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
  mockStudentsRepo.findActiveRoutineSchedules.mockResolvedValue(new Map());
  mockStudentsRepo.findLastSessionDates.mockResolvedValue([]);
  mockOverviewRepo.findFinishedSessionsSince.mockResolvedValue([]);
  mockOverviewRepo.findRecentFinished.mockResolvedValue([]);
});
afterEach(() => jest.useRealTimers());

describe('overview.service', () => {
  it('sin alumnos activos no hace más consultas', async () => {
    mockOverviewRepo.findActiveStudents.mockResolvedValue([]);
    const r = await overview('t1');
    expect(r.active_students.count).toBe(0);
    expect(mockOverviewRepo.findFinishedSessionsSince).not.toHaveBeenCalled();
  });

  it('una consulta por lote para cada dato, con la ventana de 14 días en hora argentina', async () => {
    mockOverviewRepo.findActiveStudents.mockResolvedValue([{ id: 'a', name: 'Ana', created_at: '2026-09-01T12:00:00Z' }]);
    mockStudentsRepo.findLastSessionDates.mockResolvedValue([{ student_id: 'a', last_session_at: '2026-10-20T15:00:00Z' }]);
    const r = await overview('t1');
    expect(mockOverviewRepo.findActiveStudents).toHaveBeenCalledWith('t1');
    expect(mockStudentsRepo.findActiveRoutineSchedules).toHaveBeenCalledWith(['a']);
    expect(mockOverviewRepo.findFinishedSessionsSince).toHaveBeenCalledWith(['a'], '2026-10-22T00:00:00-03:00');
    expect(mockOverviewRepo.findRecentFinished).toHaveBeenCalledWith(['a'], RECENT_LIMIT);
    // Última sesión hace 16 días: en riesgo.
    expect(r.at_risk).toBe(1);
    expect(r.attention[0]).toMatchObject({ kind: 'inactive', student_id: 'a', days: 16 });
  });

  it('una sesión que empezó antes de la ventana y se cerró adentro cuenta en daily, no en la adherencia', async () => {
    // Hoy 05/11: empezó el miércoles 21/10 y se cerró el 23/10 (primera barra del gráfico).
    mockOverviewRepo.findActiveStudents.mockResolvedValue([{ id: 'a', name: 'Ana', created_at: '2026-09-01T12:00:00Z' }]);
    mockStudentsRepo.findActiveRoutineSchedules.mockResolvedValue(
      new Map([['a', { days: ['wednesday'], daySince: new Map([['wednesday', '2026-09-01']]) }]])
    );
    mockOverviewRepo.findFinishedSessionsSince.mockResolvedValue([
      { id: 's1', student_id: 'a', started_at: '2026-10-21T15:00:00Z', finished_at: '2026-10-23T15:00:00Z', trainer_comment: 'ok' },
    ]);
    const r = await overview('t1');
    expect(r.daily[0]).toEqual({ date: '2026-10-23', count: 1 });
    expect(r.daily.reduce((n, d) => n + d.count, 0)).toBe(1);
    // El 21/10 queda fuera de las dos semanas de la adherencia (29/10–04/11 y 22/10–28/10): 0 % en ambas.
    expect(r.adherence_7d).toEqual({ pct: 0, delta: 0 });
  });

  it('sin alumnos activos: daily con 14 ceros hasta hoy y el resto vacío', async () => {
    mockOverviewRepo.findActiveStudents.mockResolvedValue([]);
    const r = await overview('t1');
    expect(r.daily).toHaveLength(14);
    expect(r.daily.every((d) => d.count === 0)).toBe(true);
    expect(r.daily[0].date).toBe('2026-10-23');
    expect(r.daily.at(-1).date).toBe('2026-11-05');
    expect(r).toMatchObject({
      active_students: { count: 0, new_7d: 0 },
      sessions_today: { done: 0, expected: 0 },
      adherence_7d: { pct: null, delta: null },
      at_risk: 0,
      attention: [],
      recent: [],
      lists: { today: [], at_risk: [], feedback_pending: [], students: [] },
    });
  });
});
