import { deleteQaData, findStaleQaTrainerIds } from '../../../../scripts/lib/qa-cleanup.js';
import { createFakeSupabase } from '../../../helpers/scripts/fake-supabase.js';

const QA_LIKE = 'it.%@test.fittrainer.dev';

describe('qa-cleanup — deleteQaData', () => {
  it('con lista vacía no toca la base', async () => {
    const fake = createFakeSupabase();
    await expect(deleteQaData(fake, [])).resolves.toEqual({ trainers: 0, students: 0 });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it('solo borra los trainers QA confirmados, sus alumnos y las filas sin FK', async () => {
    const fake = createFakeSupabase({
      'trainers:select': { data: [{ id: 't-qa' }], error: null },
      'students:select': { data: [{ id: 's-1' }, { id: 's-2' }], error: null },
    });

    const result = await deleteQaData(fake, ['t-qa', 't-ajeno']);

    expect(result).toEqual({ trainers: 1, students: 2 });
    const [reread, students, ...deletes] = fake.calls;
    expect(reread).toMatchObject({ table: 'trainers', op: 'select' });
    expect(reread.filters).toEqual([
      ['in', 'id', ['t-qa', 't-ajeno']],
      ['like', 'email', QA_LIKE],
    ]);
    expect(students).toMatchObject({ table: 'students', op: 'select' });
    expect(students.filters).toEqual([['in', 'trainer_id', ['t-qa']]]);
    expect(deletes.map((c) => [c.table, c.op, c.filters])).toEqual([
      ['notifications', 'delete', [['in', 'user_id', ['t-qa', 's-1', 's-2']]]],
      ['push_tokens', 'delete', [['in', 'user_id', ['t-qa', 's-1', 's-2']]]],
      ['refresh_tokens', 'delete', [['in', 'user_id', ['t-qa', 's-1', 's-2']]]],
      ['students', 'delete', [['in', 'trainer_id', ['t-qa']]]],
      ['trainers', 'delete', [['in', 'id', ['t-qa']]]],
    ]);
  });

  // Borrar el trainer de una sola vez choca: la cascada a `exercises` corre antes que la de
  // students → routines → routine_exercises y la FK (NO ACTION) de routine_exercises corta.
  it('borra los alumnos antes que el trainer (las rutinas apuntan a sus ejercicios)', async () => {
    const fake = createFakeSupabase({
      'trainers:select': { data: [{ id: 't-qa' }], error: null },
    });
    await deleteQaData(fake, ['t-qa']);
    const order = fake.calls.filter((c) => c.op === 'delete').map((c) => c.table);
    expect(order.slice(-2)).toEqual(['students', 'trainers']);
  });

  it('si ningún id es QA no borra nada', async () => {
    const fake = createFakeSupabase({ 'trainers:select': { data: [], error: null } });
    await expect(deleteQaData(fake, ['t-ajeno'])).resolves.toEqual({ trainers: 0, students: 0 });
    expect(fake.calls.filter((c) => c.op === 'delete')).toEqual([]);
  });

  it('un error de supabase en un delete rechaza', async () => {
    const fake = createFakeSupabase({
      'trainers:select': { data: [{ id: 't-qa' }], error: null },
      'push_tokens:delete': { data: null, error: { message: 'boom' } },
    });
    await expect(deleteQaData(fake, ['t-qa'])).rejects.toThrow(/boom/);
    expect(fake.calls.some((c) => c.table === 'trainers' && c.op === 'delete')).toBe(false);
  });

  it('un error al releer los trainers rechaza', async () => {
    const fake = createFakeSupabase({
      'trainers:select': { data: null, error: { message: 'sin conexión' } },
    });
    await expect(deleteQaData(fake, ['t-qa'])).rejects.toThrow(/sin conexión/);
  });
});

describe('qa-cleanup — findStaleQaTrainerIds', () => {
  const now = new Date('2026-11-02T12:00:00Z');

  it('busca los trainers QA creados hace más de una hora', async () => {
    const fake = createFakeSupabase({
      'trainers:select': { data: [{ id: 't-1' }, { id: 't-2' }], error: null },
    });

    await expect(findStaleQaTrainerIds(fake, { now })).resolves.toEqual(['t-1', 't-2']);
    expect(fake.calls[0].filters).toEqual([
      ['like', 'email', QA_LIKE],
      ['lt', 'created_at', '2026-11-02T11:00:00.000Z'],
    ]);
  });

  it('con all: true no filtra por fecha', async () => {
    const fake = createFakeSupabase();
    await findStaleQaTrainerIds(fake, { now, all: true });
    expect(fake.calls[0].filters).toEqual([['like', 'email', QA_LIKE]]);
  });

  it('un error de supabase rechaza', async () => {
    const fake = createFakeSupabase({
      'trainers:select': { data: null, error: { message: 'boom' } },
    });
    await expect(findStaleQaTrainerIds(fake, { now })).rejects.toThrow(/boom/);
  });
});
