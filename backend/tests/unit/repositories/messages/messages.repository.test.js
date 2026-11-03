import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const result = { current: { data: [], error: null } };
const q = {};
for (const m of ['select', 'eq', 'lt', 'in', 'is', 'limit', 'order', 'insert', 'update', 'range', 'single']) {
  q[m] = jest.fn(() => q);
}
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/messages/messages.repository.js'));

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: [], error: null };
});

describe('messages.repository', () => {
  it('insertMessage inserta y devuelve la fila', async () => {
    result.current = { data: { id: 'm' }, error: null };
    await expect(repo.insertMessage({ body: 'x' })).resolves.toEqual({ id: 'm' });
    expect(supabase.from).toHaveBeenCalledWith('messages');
    expect(q.insert).toHaveBeenCalledWith({ body: 'x' });
  });

  it('insertMany hace un solo insert con todas las filas', async () => {
    await repo.insertMany([{ a: 1 }, { a: 2 }]);
    expect(q.insert).toHaveBeenCalledTimes(1);
    expect(q.insert).toHaveBeenCalledWith([{ a: 1 }, { a: 2 }]);
  });

  it('un error de supabase se vuelve error interno', async () => {
    result.current = { data: null, error: { message: 'boom' } };
    await expect(repo.insertMany([{}])).rejects.toMatchObject({ statusCode: 500 });
  });

  it('findPage filtra por alumno y before, ordena created_at e id desc y pide limit + 1', async () => {
    await repo.findPage('s-1', { before: 'B', limit: 50 });
    expect(q.eq).toHaveBeenCalledWith('student_id', 's-1');
    expect(q.lt).toHaveBeenCalledWith('created_at', 'B');
    expect(q.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
    expect(q.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    expect(q.limit).toHaveBeenCalledWith(51);
  });

  it('findPage sin before no agrega el filtro', async () => {
    await repo.findPage('s-1', { before: null, limit: 5 });
    expect(q.lt).not.toHaveBeenCalled();
  });

  it('markRead filtra por alumno, rol emisor y sin leer; devuelve cuántos', async () => {
    result.current = { data: [{ id: 1 }, { id: 2 }], error: null };
    await expect(repo.markRead('s-1', 'student')).resolves.toBe(2);
    expect(q.eq).toHaveBeenCalledWith('student_id', 's-1');
    expect(q.eq).toHaveBeenCalledWith('sender_role', 'student');
    expect(q.is).toHaveBeenCalledWith('read_at', null);
    expect(q.update).toHaveBeenCalledWith({ read_at: expect.any(String) });
  });

  it('countUnread cuenta con head sobre los alumnos y el rol emisor', async () => {
    result.current = { count: 4, error: null };
    await expect(repo.countUnread({ studentIds: ['a', 'b'], senderRole: 'trainer' })).resolves.toBe(4);
    expect(q.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(q.in).toHaveBeenCalledWith('student_id', ['a', 'b']);
    expect(q.eq).toHaveBeenCalledWith('sender_role', 'trainer');
    expect(q.is).toHaveBeenCalledWith('read_at', null);
  });

  it('countUnread sin alumnos devuelve 0 sin consultar', async () => {
    await expect(repo.countUnread({ studentIds: [], senderRole: 'student' })).resolves.toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('findLastByStudents hace limit(1) por alumno y devuelve un Map', async () => {
    result.current = { data: [{ student_id: 'a', id: 'm' }], error: null };
    const map = await repo.findLastByStudents(['a', 'b']);
    expect(q.limit).toHaveBeenCalledTimes(2);
    expect(q.limit).toHaveBeenCalledWith(1);
    expect(map.get('a')).toMatchObject({ id: 'm' });
  });

  it('findLastByStudents omite a los alumnos sin mensajes', async () => {
    result.current = { data: [], error: null };
    expect((await repo.findLastByStudents(['a'])).size).toBe(0);
  });

  it('countUnreadByStudents agrupa por alumno', async () => {
    result.current = { data: [{ student_id: 'a' }, { student_id: 'a' }, { student_id: 'b' }], error: null };
    const map = await repo.countUnreadByStudents(['a', 'b', 'c'], 'student');
    expect(map.get('a')).toBe(2);
    expect(map.get('b')).toBe(1);
    expect(map.has('c')).toBe(false);
    expect(q.in).toHaveBeenCalledWith('student_id', ['a', 'b', 'c']);
    expect(q.eq).toHaveBeenCalledWith('sender_role', 'student');
  });

  it('countUnreadByStudents sin alumnos no consulta', async () => {
    expect((await repo.countUnreadByStudents([], 'student')).size).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
