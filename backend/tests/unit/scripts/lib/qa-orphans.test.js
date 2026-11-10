import { describe, expect, it } from '@jest/globals';
import { deleteOrphanRows, findOrphanRows } from '../../../../scripts/lib/qa-orphans.js';
import { createFakeSupabase } from '../../../helpers/scripts/fake-supabase.js';

const rowsOf = (column, values) => ({ data: values.map((v) => ({ [column]: v })), error: null });
const NONE = { notifications: { userIds: [] }, push_tokens: { userIds: [] }, refresh_tokens: { userIds: [] } };

describe('qa-orphans — findOrphanRows', () => {
  it('cuenta por tabla las filas cuyo user_id no está en trainers ni en students', async () => {
    const fake = createFakeSupabase({
      'notifications:select': rowsOf('user_id', ['t-1', 'gone', 'gone', 's-1']),
      'push_tokens:select': rowsOf('user_id', ['s-1']),
      'refresh_tokens:select': rowsOf('user_id', ['other-gone']),
      'trainers:select': rowsOf('id', ['t-1']),
      'students:select': rowsOf('id', ['s-1']),
    });

    await expect(findOrphanRows(fake)).resolves.toEqual({
      notifications: { rows: 2, userIds: ['gone'] },
      push_tokens: { rows: 0, userIds: [] },
      refresh_tokens: { rows: 1, userIds: ['other-gone'] },
    });
    // Primero las filas, después los usuarios.
    expect(fake.calls.map((c) => c.table)).toEqual([
      'notifications', 'push_tokens', 'refresh_tokens', 'trainers', 'students',
    ]);
  });

  it('pagina de a 1000 hasta una página incompleta', async () => {
    const page = (call) => {
      const [, from] = call.filters.find(([m]) => m === 'range');
      return rowsOf('user_id', from === 0 ? Array(1000).fill('gone') : ['gone']);
    };
    const fake = createFakeSupabase({ 'notifications:select': page });
    const result = await findOrphanRows(fake);
    expect(result.notifications).toEqual({ rows: 1001, userIds: ['gone'] });
    const ranges = fake.calls
      .filter((c) => c.table === 'notifications')
      .map((c) => c.filters.find(([m]) => m === 'range').slice(1));
    expect(ranges).toEqual([[0, 999], [1000, 1999]]);
  });

  it('ordena por user_id y desempata por id para que las páginas sean estables', async () => {
    const fake = createFakeSupabase();
    await findOrphanRows(fake);
    const orders = (table) =>
      fake.calls.find((c) => c.table === table).filters.filter(([m]) => m === 'order').map(([, col]) => col);
    expect(orders('notifications')).toEqual(['user_id', 'id']);
    expect(orders('trainers')).toEqual(['id']);
  });

  it('un error de supabase rechaza', async () => {
    const fake = createFakeSupabase({ 'push_tokens:select': { data: null, error: { message: 'boom' } } });
    await expect(findOrphanRows(fake)).rejects.toThrow(/boom/);
  });
});

describe('qa-orphans — deleteOrphanRows', () => {
  it('sin huérfanos no borra nada', async () => {
    const fake = createFakeSupabase();
    await expect(deleteOrphanRows(fake, NONE)).resolves.toEqual({
      notifications: 0, push_tokens: 0, refresh_tokens: 0,
    });
    expect(fake.calls).toEqual([]);
  });

  it('relee los usuarios y no borra a uno que volvió a existir', async () => {
    const fake = createFakeSupabase({ 'students:select': rowsOf('id', ['revived']) });
    const result = await deleteOrphanRows(fake, {
      ...NONE,
      notifications: { userIds: ['gone', 'revived'] },
    });

    expect(result).toEqual({ notifications: 1, push_tokens: 0, refresh_tokens: 0 });
    const deletes = fake.calls.filter((c) => c.op === 'delete');
    expect(deletes.map((c) => [c.table, c.filters])).toEqual([
      ['notifications', [['in', 'user_id', ['gone']]]],
    ]);
  });

  it('borra en tandas de 100 ids', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `gone-${i}`);
    const fake = createFakeSupabase();
    await deleteOrphanRows(fake, { ...NONE, refresh_tokens: { userIds: ids } });
    const sizes = fake.calls.filter((c) => c.op === 'delete').map((c) => c.filters[0][2].length);
    expect(sizes).toEqual([100, 50]);
  });
});
