import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

// Builder encadenable y "thenable": cada método devuelve el mismo objeto.
const result = { current: { data: [], error: null } };
const q = {};
for (const m of ['select', 'eq', 'in', 'gte', 'or', 'not', 'order', 'range', 'limit']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/students/overview.repository.js'));

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: [], error: null };
});

describe('overview.repository — findFinishedSessionsSince', () => {
  it('trae lo que empezó o terminó en la ventana (una que empezó antes y cerró adentro también cuenta)', async () => {
    result.current = {
      data: [{ id: 'ss1', student_id: 's1', started_at: '2026-10-21T15:00:00Z', finished_at: '2026-10-23T15:00:00Z', routine: { name: 'Full' } }],
      error: null,
    };
    const from = '2026-10-22T00:00:00-03:00';
    const rows = await repo.findFinishedSessionsSince(['s1'], from);
    expect(q.in).toHaveBeenCalledWith('student_id', ['s1']);
    expect(q.or).toHaveBeenCalledWith(`started_at.gte.${from},finished_at.gte.${from}`);
    expect(q.gte).not.toHaveBeenCalled();
    expect(q.not).toHaveBeenCalledWith('finished_at', 'is', null);
    expect(rows).toEqual([
      { id: 'ss1', student_id: 's1', started_at: '2026-10-21T15:00:00Z', finished_at: '2026-10-23T15:00:00Z', routine_name: 'Full' },
    ]);
  });
});
