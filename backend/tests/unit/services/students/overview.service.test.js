import { jest } from '@jest/globals';

const mockOverviewRepo = { findActiveStudents: jest.fn(), findFinishedSessionsSince: jest.fn(), findRecentFinished: jest.fn() };
const mockStudentsRepo = { findActiveRoutineDays: jest.fn(), findLastSessionDates: jest.fn() };
jest.unstable_mockModule('../../../../src/repositories/students/overview.repository.js', () => mockOverviewRepo);
jest.unstable_mockModule('../../../../src/repositories/students/students.repository.js', () => mockStudentsRepo);

const { overview, RECENT_LIMIT } = await import('../../../../src/services/students/overview.service.js');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: new Date('2026-11-05T16:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
  mockStudentsRepo.findActiveRoutineDays.mockResolvedValue(new Map());
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
    expect(mockStudentsRepo.findActiveRoutineDays).toHaveBeenCalledWith(['a']);
    expect(mockOverviewRepo.findFinishedSessionsSince).toHaveBeenCalledWith(['a'], '2026-10-22T00:00:00-03:00');
    expect(mockOverviewRepo.findRecentFinished).toHaveBeenCalledWith(['a'], RECENT_LIMIT);
    // Última sesión hace 16 días: en riesgo.
    expect(r.at_risk).toBe(1);
    expect(r.attention[0]).toMatchObject({ kind: 'inactive', student_id: 'a', days: 16 });
  });
});
