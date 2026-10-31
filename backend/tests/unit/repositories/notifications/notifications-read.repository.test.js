import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const result = { current: { data: [], error: null } };
const q = {};
for (const m of ['select', 'eq', 'lt', 'in', 'limit', 'order', 'update', 'delete', 'upsert']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/notifications/notifications-read.repository.js'));

const USER = { id: 'u-1', role: 'student' };

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: [], error: null };
});

describe('notifications-read.repository', () => {
  it('findPage filtra por dueño, no leídas y before; ordena created_at e id desc', async () => {
    await repo.findPage(USER, { unreadOnly: true, limit: 5, before: 'B' });
    expect(q.eq).toHaveBeenCalledWith('user_id', 'u-1');
    expect(q.eq).toHaveBeenCalledWith('user_role', 'student');
    expect(q.eq).toHaveBeenCalledWith('read', false);
    expect(q.lt).toHaveBeenCalledWith('created_at', 'B');
    expect(q.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
    expect(q.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    expect(q.limit).toHaveBeenCalledWith(5);
  });

  it('findPage sin filtros no agrega read ni before', async () => {
    await repo.findPage(USER, { unreadOnly: false, limit: 5 });
    expect(q.eq).not.toHaveBeenCalledWith('read', false);
    expect(q.lt).not.toHaveBeenCalled();
  });

  it('countUnread usa conteo head', async () => {
    result.current = { count: 4, error: null };
    await expect(repo.countUnread(USER)).resolves.toBe(4);
    expect(q.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
  });

  it('markRead filtra por id y dueño y cuenta filas', async () => {
    result.current = { data: [{ id: 'n-1' }], error: null };
    await expect(repo.markRead(USER, 'n-1')).resolves.toBe(1);
    expect(q.eq).toHaveBeenCalledWith('id', 'n-1');
    expect(q.eq).toHaveBeenCalledWith('user_id', 'u-1');
  });

  it('markAllRead solo toca no leídas propias', async () => {
    await repo.markAllRead(USER);
    expect(q.update).toHaveBeenCalledWith({ read: true });
    expect(q.eq).toHaveBeenCalledWith('user_id', 'u-1');
    expect(q.eq).toHaveBeenCalledWith('read', false);
  });

  it('un error de supabase se propaga', async () => {
    result.current = { data: null, count: null, error: { message: 'boom' } };
    await expect(repo.countUnread(USER)).rejects.toThrow('boom');
  });
});
