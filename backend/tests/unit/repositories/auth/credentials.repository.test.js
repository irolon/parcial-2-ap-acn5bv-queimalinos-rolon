import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const result = { current: { data: null, error: null } };
const q = {};
for (const m of ['select', 'eq', 'update', 'maybeSingle', 'single']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/auth/credentials.repository.js'));

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: null, error: null };
});

describe('credentials.repository', () => {
  it.each([
    ['trainer', 'trainers'],
    ['student', 'students'],
  ])('findPasswordHash de %s lee la tabla %s', async (role, table) => {
    result.current = { data: { password_hash: '$2a$hash' }, error: null };
    await expect(repo.findPasswordHash('u-1', role)).resolves.toBe('$2a$hash');
    expect(supabase.from).toHaveBeenCalledWith(table);
    expect(q.select).toHaveBeenCalledWith('password_hash');
    expect(q.eq).toHaveBeenCalledWith('id', 'u-1');
  });

  it('findPasswordHash sin fila → null', async () => {
    await expect(repo.findPasswordHash('u-1', 'student')).resolves.toBeNull();
  });

  it('setPassword de alumno guarda hash, fecha y el flag', async () => {
    result.current = { data: { password_changed_at: '2026-11-09T12:00:00Z' }, error: null };
    const out = await repo.setPassword('s-1', 'student', { hash: 'h', mustChange: true });
    expect(supabase.from).toHaveBeenCalledWith('students');
    const patch = q.update.mock.calls[0][0];
    expect(patch).toMatchObject({ password_hash: 'h', must_change_password: true });
    expect(typeof patch.password_changed_at).toBe('string');
    expect(q.eq).toHaveBeenCalledWith('id', 's-1');
    expect(out).toEqual({ password_changed_at: '2026-11-09T12:00:00Z' });
  });

  it('setPassword de trainer no manda must_change_password (la tabla no la tiene)', async () => {
    result.current = { data: { password_changed_at: 'x' }, error: null };
    await repo.setPassword('t-1', 'trainer', { hash: 'h', mustChange: false });
    expect(supabase.from).toHaveBeenCalledWith('trainers');
    expect(q.update.mock.calls[0][0]).not.toHaveProperty('must_change_password');
  });

  it('error de Supabase → INTERNAL_ERROR', async () => {
    result.current = { data: null, error: { message: 'boom' } };
    await expect(repo.findPasswordHash('u-1', 'trainer')).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
    });
    await expect(
      repo.setPassword('u-1', 'trainer', { hash: 'h', mustChange: false })
    ).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });
});
