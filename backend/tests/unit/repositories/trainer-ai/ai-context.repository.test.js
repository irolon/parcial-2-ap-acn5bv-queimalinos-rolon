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

  it('findLibraryByIds: los ejercicios de esos ids que siguen accesibles (globales o propios)', async () => {
    fake.result = { data: [{ id: 'e2' }], error: null };
    await expect(repo.findLibraryByIds('t-1', ['e1', 'e2'])).resolves.toEqual([{ id: 'e2' }]);
    expect(fake.tables).toEqual(['exercises']);
    expect(callsOf('select')).toEqual([['id, name, muscle_group, equipment']]);
    expect(callsOf('or')).toEqual([['is_global.eq.true,trainer_id.eq.t-1']]);
    expect(callsOf('in')).toEqual([['id', ['e1', 'e2']]]);
  });

  it('findLibraryByIds sin ids no consulta la base', async () => {
    await expect(repo.findLibraryByIds('t-1', [])).resolves.toEqual([]);
    expect(fake.tables).toEqual([]);
  });

  it('findRecentTemplates: las 3 más nuevas del trainer con su structure, sin el nombre', async () => {
    fake.result = { data: [], error: null };
    await repo.findRecentTemplates('t-1');
    expect(fake.tables).toEqual(['routine_templates']);
    expect(callsOf('select')).toEqual([['goal, level, structure']]);
    expect(callsOf('eq')).toEqual([['trainer_id', 't-1']]);
    expect(callsOf('order')).toEqual([['created_at', { ascending: false }]]);
    expect(callsOf('limit')).toEqual([[3]]);
  });

  it('findRecentRoutines: las 3 más nuevas del trainer con ese goal, sin las del alumno excluido', async () => {
    fake.result = { data: [], error: null };
    await repo.findRecentRoutines('t-1', { goal: 'strength', excludeStudentId: 's-1' });
    expect(fake.tables).toEqual(['routines']);
    expect(callsOf('select')).toEqual([['goal, days, routine_exercises ( order_index, exercise:exercise_id ( name ) )']]);
    expect(callsOf('eq')).toEqual([['trainer_id', 't-1'], ['goal', 'strength']]);
    expect(callsOf('neq')).toEqual([['student_id', 's-1']]);
    expect(callsOf('order')).toEqual([['created_at', { ascending: false }]]);
    expect(callsOf('limit')).toEqual([[3]]);
  });

  it('findRecentRoutines sin excludeStudentId no filtra por alumno ni por active', async () => {
    fake.result = { data: [], error: null };
    await repo.findRecentRoutines('t-1', { goal: 'strength' });
    expect(callsOf('neq')).toEqual([]);
    expect(callsOf('eq')).toEqual([['trainer_id', 't-1'], ['goal', 'strength']]);
  });

  it('un error de la base es 500', async () => {
    fake.result = { data: null, error: { message: 'boom' } };
    await expect(repo.findRecentTemplates('t-1')).rejects.toMatchObject({ statusCode: 500 });
  });
});
