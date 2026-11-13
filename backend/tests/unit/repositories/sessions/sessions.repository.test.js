import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

// Builder encadenable y "thenable": cada método devuelve el mismo objeto.
const result = { current: { data: [], error: null } };
const q = {};
for (const m of ['delete', 'eq', 'is', 'select']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const { deleteOpenSession } = await import(src('repositories/sessions/sessions.repository.js'));

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: [], error: null };
});

describe('sessions.repository — deleteOpenSession', () => {
  it('borra solo si es de ese alumno y sigue abierta, en una sola sentencia', async () => {
    result.current = { data: [{ id: 's1' }], error: null };
    await expect(deleteOpenSession('s1', 'st')).resolves.toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('sessions');
    expect(q.delete).toHaveBeenCalledTimes(1);
    expect(q.eq).toHaveBeenCalledWith('id', 's1');
    expect(q.eq).toHaveBeenCalledWith('student_id', 'st');
    expect(q.is).toHaveBeenCalledWith('finished_at', null);
    expect(q.select).toHaveBeenCalledWith('id');
  });

  it('sin fila borrada (terminada, ajena o inexistente): false', async () => {
    await expect(deleteOpenSession('s1', 'st')).resolves.toBe(false);
  });

  it('error de la base: 500', async () => {
    result.current = { data: null, error: { message: 'boom' } };
    await expect(deleteOpenSession('s1', 'st')).rejects.toMatchObject({ statusCode: 500 });
  });
});
