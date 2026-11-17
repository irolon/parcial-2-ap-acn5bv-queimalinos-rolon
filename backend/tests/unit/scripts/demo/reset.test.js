import { resetDemo } from '../../../../scripts/demo/reset.js';
import { createFakeSupabase } from '../../../helpers/scripts/fake-supabase.js';

const DEMO_LIKE = '%@demo.fittrainer.dev';

describe('demo — reseteo', () => {
  it('busca y borra solo los trainers del dominio de la demo, con sus alumnos', async () => {
    const fake = createFakeSupabase({
      'trainers:select': { data: [{ id: 't-demo' }], error: null },
      'students:select': { data: [{ id: 's-1' }], error: null },
    });

    const result = await resetDemo(fake);

    expect(result).toEqual({ trainers: 1, students: 1 });
    const [find, reread] = fake.calls;
    expect(find).toMatchObject({ table: 'trainers', op: 'select' });
    expect(find.filters).toEqual([['like', 'email', DEMO_LIKE]]);
    expect(reread.filters).toEqual([
      ['in', 'id', ['t-demo']],
      ['like', 'email', DEMO_LIKE],
    ]);
    const deletes = fake.calls.filter((c) => c.op === 'delete').map((c) => c.table);
    expect(deletes.slice(-2)).toEqual(['students', 'trainers']);
  });

  it('sin demo cargada no borra nada', async () => {
    const fake = createFakeSupabase({ 'trainers:select': { data: [], error: null } });
    await expect(resetDemo(fake)).resolves.toEqual({ trainers: 0, students: 0 });
    expect(fake.calls.filter((c) => c.op === 'delete')).toHaveLength(0);
  });
});
