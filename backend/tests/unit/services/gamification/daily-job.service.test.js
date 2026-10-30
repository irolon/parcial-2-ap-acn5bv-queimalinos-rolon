import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const mockDaily = { findStudentIdsToEvaluate: jest.fn(), failExpiredAssignments: jest.fn() };
const mockGam = { findCatalog: jest.fn() };
const mockEvaluate = { evaluateStudent: jest.fn() };
jest.unstable_mockModule(src('repositories/gamification/daily-job.repository.js'), () => mockDaily);
jest.unstable_mockModule(src('repositories/gamification/gamification.repository.js'), () => mockGam);
jest.unstable_mockModule(src('services/gamification/evaluate.service.js'), () => mockEvaluate);

const { runDailyGamification } = await import('../../../../src/services/gamification/daily-job.service.js');

const NOW = new Date('2026-10-30T06:00:00Z');
const CATALOG = [{ id: 'a-1' }];

beforeEach(() => {
  mockDaily.findStudentIdsToEvaluate.mockResolvedValue([]);
  mockDaily.failExpiredAssignments.mockResolvedValue(0);
  mockGam.findCatalog.mockResolvedValue(CATALOG);
  mockEvaluate.evaluateStudent.mockResolvedValue({ unlocked: [], streak: {} });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('runDailyGamification', () => {
  it('evalúa a cada alumno con el catálogo cargado una sola vez', async () => {
    mockDaily.findStudentIdsToEvaluate.mockResolvedValue(['s-1', 's-2']);
    const result = await runDailyGamification({ now: NOW });
    expect(result).toEqual({ failedChallenges: 0, evaluated: 2, errors: 0 });
    expect(mockGam.findCatalog).toHaveBeenCalledTimes(1);
    expect(mockEvaluate.evaluateStudent).toHaveBeenCalledWith('s-1', { now: NOW, catalog: CATALOG });
    expect(mockEvaluate.evaluateStudent).toHaveBeenCalledWith('s-2', { now: NOW, catalog: CATALOG });
  });

  it('falla los vencidos después de evaluar y devuelve la cantidad', async () => {
    mockDaily.findStudentIdsToEvaluate.mockResolvedValue(['s-1']);
    const order = [];
    mockEvaluate.evaluateStudent.mockImplementation(async () => order.push('evaluate'));
    mockDaily.failExpiredAssignments.mockImplementation(async () => {
      order.push('fail');
      return 3;
    });
    const result = await runDailyGamification({ now: NOW });
    expect(result.failedChallenges).toBe(3);
    expect(order).toEqual(['evaluate', 'fail']);
    expect(mockDaily.failExpiredAssignments).toHaveBeenCalledWith(NOW);
  });

  it('un alumno que falla se cuenta como error y no corta al resto', async () => {
    mockDaily.findStudentIdsToEvaluate.mockResolvedValue(['s-1', 's-2', 's-3']);
    mockEvaluate.evaluateStudent.mockImplementation(async (id) => {
      if (id === 's-2') throw new Error('boom');
    });
    const result = await runDailyGamification({ now: NOW });
    expect(result).toEqual({ failedChallenges: 0, evaluated: 2, errors: 1 });
    expect(mockEvaluate.evaluateStudent).toHaveBeenCalledTimes(3);
    expect(console.error).toHaveBeenCalled();
  });
});
