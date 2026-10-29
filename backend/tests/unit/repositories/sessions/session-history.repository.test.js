import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

// Builder encadenable y "thenable": cada método devuelve el mismo objeto.
const result = { current: { data: [], count: 0, error: null } };
const q = {};
for (const m of ['select', 'eq', 'in', 'order', 'range', 'maybeSingle']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q), rpc: jest.fn(() => Promise.resolve(result.current)) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/sessions/session-history.repository.js'));

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: [], count: 0, error: null };
});

describe('session-history.repository', () => {
  it('findSessionsPage: range por página, orden desc y total exacto', async () => {
    result.current = { data: [{ id: 'a' }], count: 57, error: null };
    await expect(repo.findSessionsPage('st', { page: 3, limit: 20 })).resolves.toEqual({
      data: [{ id: 'a' }], total: 57,
    });
    expect(q.select).toHaveBeenCalledWith(expect.stringContaining('trainer_comment'), { count: 'exact' });
    expect(q.eq).toHaveBeenCalledWith('student_id', 'st');
    expect(q.order).toHaveBeenCalledWith('started_at', { ascending: false });
    expect(q.range).toHaveBeenCalledWith(40, 59);
  });

  it('findStudentSession: filtra por id y por alumno', async () => {
    result.current = { data: { id: 's' }, error: null };
    await expect(repo.findStudentSession('st', 's')).resolves.toEqual({ id: 's' });
    expect(q.eq).toHaveBeenCalledWith('id', 's');
    expect(q.eq).toHaveBeenCalledWith('student_id', 'st');
  });

  it('consultas por lote usan .in(...)', async () => {
    await repo.findSetsForSessions(['a', 'b']);
    expect(q.in).toHaveBeenLastCalledWith('session_id', ['a', 'b']);
    await repo.findRoutinesByIds(['r']);
    expect(q.in).toHaveBeenLastCalledWith('id', ['r']);
    await repo.findRoutineExercisesByIds(['re']);
    expect(q.in).toHaveBeenLastCalledWith('id', ['re']);
    await repo.findExercisesByIds(['e']);
    expect(q.in).toHaveBeenLastCalledWith('id', ['e']);
  });

  it('fetchSessionRecords llama al RPC session_records', async () => {
    result.current = { data: [{ session_id: 'a', exercise_id: 'e' }], error: null };
    await expect(repo.fetchSessionRecords('st', ['a'])).resolves.toHaveLength(1);
    expect(supabase.rpc).toHaveBeenCalledWith('session_records', {
      p_student_id: 'st', p_session_ids: ['a'],
    });
  });

  it('error de la base: 500', async () => {
    result.current = { data: null, count: null, error: { message: 'boom' } };
    await expect(repo.findSessionsPage('st', { page: 1, limit: 20 })).rejects.toMatchObject({ statusCode: 500 });
    await expect(repo.findSetsForSessions(['a'])).rejects.toMatchObject({ statusCode: 500 });
    await expect(repo.fetchSessionRecords('st', ['a'])).rejects.toMatchObject({ statusCode: 500 });
  });
});
