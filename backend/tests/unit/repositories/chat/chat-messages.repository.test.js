import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { fake, reset, supabase, callsOf } from '../../../helpers/trainer-ai/supabase-fake.js';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/chat/chat-messages.repository.js'));
const FROM = '2026-11-07T03:00:00.000Z';
const TO = '2026-11-08T03:00:00.000Z';

describe('chat-messages.repository', () => {
  beforeEach(reset);

  it('findDayMessages: los del alumno en [from, to), viejos primero y, en el mismo instante, el del alumno antes', async () => {
    fake.result = { data: [{ id: 'm1' }], error: null };
    await expect(repo.findDayMessages('s-1', FROM, TO)).resolves.toEqual([{ id: 'm1' }]);
    expect(fake.tables).toEqual(['chat_messages']);
    expect(callsOf('select')).toEqual([['id, role, content, created_at']]);
    expect(callsOf('eq')).toEqual([['student_id', 's-1']]);
    expect(callsOf('gte')).toEqual([['created_at', FROM]]);
    expect(callsOf('lt')).toEqual([['created_at', TO]]);
    expect(callsOf('order')).toEqual([['created_at', { ascending: true }], ['role', { ascending: false }]]);
  });

  it('insertExchange: el mensaje y la respuesta en una sola inserción, devuelve las filas', async () => {
    const rows = [
      { student_id: 's-1', session_id: null, role: 'user', content: 'hola' },
      { student_id: 's-1', session_id: null, role: 'assistant', content: 'buenas' },
    ];
    fake.result = { data: [{ id: 'u' }, { id: 'a' }], error: null };
    await expect(repo.insertExchange(rows)).resolves.toEqual([{ id: 'u' }, { id: 'a' }]);
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(callsOf('insert')).toEqual([[rows]]);
    expect(callsOf('select')).toEqual([['id, role, content, created_at']]);
  });

  it('un error de la base es 500', async () => {
    fake.result = { data: null, error: { message: 'boom' } };
    await expect(repo.findDayMessages('s-1', FROM, TO)).rejects.toMatchObject({ statusCode: 500 });
    await expect(repo.insertExchange([])).rejects.toMatchObject({ statusCode: 500 });
  });
});
