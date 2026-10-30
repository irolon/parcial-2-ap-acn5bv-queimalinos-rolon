import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

// Query encadenable: cada método devuelve la misma query y es "awaitable".
let rowsByTable;
let calls;
const makeQuery = (table) => {
  const q = {
    select: jest.fn(() => q),
    update: jest.fn((v) => {
      calls.update = { table, v };
      return q;
    }),
    eq: jest.fn(() => q),
    lt: jest.fn((col, val) => {
      calls.lt = [col, val];
      return q;
    }),
    not: jest.fn(() => q),
    order: jest.fn(() => q),
    range: jest.fn(() => q),
    then: (resolve) => resolve({ data: rowsByTable[table], error: null }),
  };
  return q;
};
jest.unstable_mockModule(src('config/supabase.js'), () => ({
  supabase: { from: jest.fn((table) => makeQuery(table)) },
}));

const repo = await import('../../../../src/repositories/gamification/daily-job.repository.js');

beforeEach(() => {
  calls = {};
  rowsByTable = {};
});

describe('findStudentIdsToEvaluate', () => {
  it('devuelve los alumnos activos con sesión cerrada o desafío activo', async () => {
    rowsByTable = {
      students: [{ id: 's-1' }, { id: 's-2' }, { id: 's-3' }],
      sessions: [{ student_id: 's-1' }, { student_id: 's-1' }, { student_id: 's-9' }],
      student_challenges: [{ student_id: 's-3' }],
    };
    expect(await repo.findStudentIdsToEvaluate()).toEqual(['s-1', 's-3']);
  });
});

describe('failExpiredAssignments', () => {
  it('actualiza las activas vencidas a failed y cuenta las filas', async () => {
    rowsByTable = { student_challenges: [{ id: 'a' }, { id: 'b' }] };
    const now = new Date('2026-10-30T06:00:00Z');
    expect(await repo.failExpiredAssignments(now)).toBe(2);
    expect(calls.update.v).toEqual({ status: 'failed' });
    expect(calls.lt).toEqual(['ends_at', '2026-10-30T06:00:00.000Z']);
  });
});
