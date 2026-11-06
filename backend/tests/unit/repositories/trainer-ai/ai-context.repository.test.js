import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { fake, reset, supabase, callsOf } from '../../../helpers/trainer-ai/supabase-fake.js';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/trainer-ai/ai-context.repository.js'));

describe('ai-context.repository', () => {
  beforeEach(reset);

  it('findLibraryForEquipment: globales y propios con ese equipamiento, solo columnas de contexto, hasta 200', async () => {
    fake.result = { data: [{ id: 'e1' }], error: null };
    await expect(repo.findLibraryForEquipment('t-1', ['dumbbell', 'bodyweight'])).resolves.toEqual([{ id: 'e1' }]);
    expect(fake.tables).toEqual(['exercises']);
    expect(callsOf('select')).toEqual([['id, name, muscle_group, equipment']]);
    expect(callsOf('or')).toEqual([['is_global.eq.true,trainer_id.eq.t-1']]);
    expect(callsOf('in')).toEqual([['equipment', ['dumbbell', 'bodyweight']]]);
    expect(callsOf('order')).toEqual([['name']]);
    expect(callsOf('limit')).toEqual([[200]]);
  });

  it('findRecentTemplates: las 3 más nuevas del trainer con su structure', async () => {
    fake.result = { data: [], error: null };
    await repo.findRecentTemplates('t-1');
    expect(fake.tables).toEqual(['routine_templates']);
    expect(callsOf('select')).toEqual([['name, goal, level, structure']]);
    expect(callsOf('eq')).toEqual([['trainer_id', 't-1']]);
    expect(callsOf('order')).toEqual([['created_at', { ascending: false }]]);
    expect(callsOf('limit')).toEqual([[3]]);
  });

  it('un error de la base es 500', async () => {
    fake.result = { data: null, error: { message: 'boom' } };
    await expect(repo.findRecentTemplates('t-1')).rejects.toMatchObject({ statusCode: 500 });
  });
});
