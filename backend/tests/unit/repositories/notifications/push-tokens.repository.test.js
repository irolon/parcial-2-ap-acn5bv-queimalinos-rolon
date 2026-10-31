import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const result = { current: { data: [], error: null } };
const q = {};
for (const m of ['select', 'eq', 'in', 'limit', 'delete', 'upsert']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const tokens = await import(src('repositories/notifications/push-tokens.repository.js'));

const USER = { id: 'u-1', role: 'student' };

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: [], error: null };
});

describe('push-tokens.repository', () => {
  it('findTokensForUser devuelve solo los strings', async () => {
    result.current = { data: [{ token: 'a' }, { token: 'b' }], error: null };
    await expect(tokens.findTokensForUser('u-1', 'student')).resolves.toEqual(['a', 'b']);
    expect(q.eq).toHaveBeenCalledWith('user_id', 'u-1');
    expect(q.eq).toHaveBeenCalledWith('user_role', 'student');
  });

  it('deleteTokens borra por token y no consulta con lista vacía', async () => {
    await tokens.deleteTokens([]);
    expect(supabase.from).not.toHaveBeenCalled();
    await tokens.deleteTokens(['a']);
    expect(q.in).toHaveBeenCalledWith('token', ['a']);
  });

  it('tokenExists', async () => {
    result.current = { data: [{ id: 1 }], error: null };
    await expect(tokens.tokenExists('t')).resolves.toBe(true);
  });

  it('upsertToken hace upsert por token con dueño y last_seen_at', async () => {
    await tokens.upsertToken(USER, 't', 'web', 'NOW');
    expect(q.upsert).toHaveBeenCalledWith(
      { token: 't', user_id: 'u-1', user_role: 'student', platform: 'web', last_seen_at: 'NOW' },
      { onConflict: 'token' }
    );
  });

  it('deleteTokenForUser filtra por token, user_id y user_role', async () => {
    await tokens.deleteTokenForUser(USER, 't');
    expect(q.delete).toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith('token', 't');
    expect(q.eq).toHaveBeenCalledWith('user_id', 'u-1');
    expect(q.eq).toHaveBeenCalledWith('user_role', 'student');
  });
});
