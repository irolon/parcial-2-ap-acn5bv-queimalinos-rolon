import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const result = { current: { data: null, error: null } };
const q = {};
for (const m of ['update', 'eq', 'neq', 'is']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/auth/auth.repository.js'));

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: null, error: null };
});

describe('auth.repository · revokeAllForUserExcept (GX1)', () => {
  it('revoca los vigentes del usuario salvo el de este dispositivo', async () => {
    await repo.revokeAllForUserExcept('u-1', 'trainer', 'hash-propio');
    expect(supabase.from).toHaveBeenCalledWith('refresh_tokens');
    expect(typeof q.update.mock.calls[0][0].revoked_at).toBe('string');
    expect(q.eq).toHaveBeenCalledWith('user_id', 'u-1');
    expect(q.eq).toHaveBeenCalledWith('role', 'trainer');
    expect(q.is).toHaveBeenCalledWith('revoked_at', null);
    expect(q.neq).toHaveBeenCalledWith('token_hash', 'hash-propio');
  });

  it('error de Supabase → INTERNAL_ERROR', async () => {
    result.current = { data: null, error: { message: 'boom' } };
    await expect(repo.revokeAllForUserExcept('u-1', 'student', 'h')).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
    });
  });
});
