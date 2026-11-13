import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

// Builder encadenable y "thenable": cada método devuelve el mismo objeto.
const result = { current: { data: [], error: null } };
const q = {};
for (const m of ['select', 'in', 'is', 'gte', 'order']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const { findOpenSessions } = await import(src('repositories/sessions/open-sessions.repository.js'));

const SINCE = '2026-11-09T17:05:00.000Z';

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: [], error: null };
});

describe('open-sessions.repository — findOpenSessions', () => {
  it('sin finished_at, desde `since` y solo de los alumnos pedidos, de la más nueva a la más vieja', async () => {
    result.current = {
      data: [{ id: 's1', student_id: 'a', started_at: '2026-11-09T20:00:00Z', routine: { name: 'Pierna' } }],
      error: null,
    };
    await expect(findOpenSessions(['a', 'b'], SINCE)).resolves.toEqual([
      { id: 's1', student_id: 'a', started_at: '2026-11-09T20:00:00Z', routine_name: 'Pierna' },
    ]);
    expect(supabase.from).toHaveBeenCalledWith('sessions');
    expect(q.select).toHaveBeenCalledWith('id, student_id, started_at, routine:routines ( name )');
    expect(q.in).toHaveBeenCalledWith('student_id', ['a', 'b']);
    expect(q.is).toHaveBeenCalledWith('finished_at', null);
    expect(q.gte).toHaveBeenCalledWith('started_at', SINCE);
    expect(q.order).toHaveBeenCalledWith('started_at', { ascending: false });
  });

  it('sin rutina: routine_name null', async () => {
    result.current = { data: [{ id: 's1', student_id: 'a', started_at: SINCE, routine: null }], error: null };
    const [row] = await findOpenSessions(['a'], SINCE);
    expect(row.routine_name).toBeNull();
  });

  it('con la lista vacía no consulta (.in con [] es inválido en PostgREST)', async () => {
    await expect(findOpenSessions([], SINCE)).resolves.toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('error de la base: 500', async () => {
    result.current = { data: null, error: { message: 'boom' } };
    await expect(findOpenSessions(['a'], SINCE)).rejects.toMatchObject({ statusCode: 500 });
  });
});
