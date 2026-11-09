import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { fake, reset, supabase, callsOf } from '../../../helpers/trainer-ai/supabase-fake.js';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/chat/chat-context.repository.js'));

describe('chat-context.repository · findAlternatives', () => {
  beforeEach(() => {
    reset();
    fake.result = { data: [{ id: 'e1' }], error: null };
  });

  it('globales y del PT, con ese equipamiento y grupo, sin los ejercicios excluidos, solo columnas de contexto, hasta 30', async () => {
    const opts = { equipment: ['dumbbell', 'bodyweight'], muscleGroup: 'chest', excludeIds: ['e1', 'e2'] };
    await expect(repo.findAlternatives('t-1', opts)).resolves.toEqual([{ id: 'e1' }]);
    expect(fake.tables).toEqual(['exercises']);
    expect(callsOf('select')).toEqual([['id, name, muscle_group, equipment']]);
    expect(callsOf('or')).toEqual([['is_global.eq.true,trainer_id.eq.t-1']]);
    expect(callsOf('in')).toEqual([['equipment', ['dumbbell', 'bodyweight']]]);
    expect(callsOf('eq')).toEqual([['muscle_group', 'chest']]);
    expect(callsOf('not')).toEqual([['id', 'in', '(e1,e2)']]);
    expect(callsOf('order')).toEqual([['name']]);
    expect(callsOf('limit')).toEqual([[30]]);
  });

  it('sin ejercicio actual: de todos los grupos y sin excluir nada', async () => {
    await repo.findAlternatives('t-1', { equipment: ['bodyweight'], muscleGroup: null, excludeIds: [] });
    expect(callsOf('eq')).toEqual([]);
    expect(callsOf('not')).toEqual([]);
  });

  it('alumno sin PT: solo los globales', async () => {
    await repo.findAlternatives(null, { equipment: ['bodyweight'] });
    expect(callsOf('or')).toEqual([]);
    expect(callsOf('eq')).toEqual([['is_global', true]]);
  });

  it('un error de la base es 500', async () => {
    fake.result = { data: null, error: { message: 'boom' } };
    await expect(repo.findAlternatives('t-1', { equipment: ['bodyweight'] })).rejects.toMatchObject({ statusCode: 500 });
  });
});
