import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const result = { current: { data: [], error: null } };
const q = {};
for (const m of ['select', 'eq', 'in', 'insert', 'update', 'delete', 'single']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const notifications = await import(src('repositories/notifications/notifications.repository.js'));

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: [], error: null };
});

describe('notifications.repository', () => {
  it('insert devuelve la fila creada', async () => {
    result.current = { data: { id: 'n-1' }, error: null };
    await expect(notifications.insert({ title: 'T' })).resolves.toEqual({ id: 'n-1' });
    expect(supabase.from).toHaveBeenCalledWith('notifications');
    expect(q.insert).toHaveBeenCalledWith({ title: 'T' });
  });

  it('insert devuelve null si la fila ya existe (índice único por sesión)', async () => {
    result.current = { data: null, error: { code: '23505', message: 'duplicate key' } };
    await expect(notifications.insert({ type: 'pr' })).resolves.toBeNull();
  });

  it('setPushSent actualiza push_sent_at', async () => {
    result.current = { data: { id: 'n-1' }, error: null };
    await notifications.setPushSent('n-1', 'ts');
    expect(q.update).toHaveBeenCalledWith({ push_sent_at: 'ts' });
    expect(q.eq).toHaveBeenCalledWith('id', 'n-1');
  });

  it('un error de supabase se propaga', async () => {
    result.current = { data: null, error: { message: 'boom' } };
    await expect(notifications.insert({})).rejects.toThrow('boom');
  });
});
