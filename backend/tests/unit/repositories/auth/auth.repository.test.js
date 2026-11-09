import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const result = { current: { data: null, error: null } };
const q = {};
for (const m of ['update', 'eq', 'neq', 'is', 'select', 'maybeSingle']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/auth/auth.repository.js'));
const { TRAINER_PUBLIC_COLUMNS } = await import(src('models/auth/trainer.model.js'));

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

describe('auth.repository · updateTrainer (GX2)', () => {
  it('actualiza por id y devuelve las columnas públicas (con professional_title, sin el hash)', async () => {
    result.current = { data: { id: 't-1', professional_title: 'Lic.' }, error: null };
    const out = await repo.updateTrainer('t-1', { professional_title: 'Lic.' });
    expect(supabase.from).toHaveBeenCalledWith('trainers');
    expect(q.update).toHaveBeenCalledWith({ professional_title: 'Lic.' });
    expect(q.eq).toHaveBeenCalledWith('id', 't-1');
    expect(q.select).toHaveBeenCalledWith(TRAINER_PUBLIC_COLUMNS);
    expect(out).toEqual({ id: 't-1', professional_title: 'Lic.' });
  });

  it('error de Supabase → INTERNAL_ERROR', async () => {
    result.current = { data: null, error: { message: 'boom' } };
    await expect(repo.updateTrainer('t-1', { name: 'X' })).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });
});
