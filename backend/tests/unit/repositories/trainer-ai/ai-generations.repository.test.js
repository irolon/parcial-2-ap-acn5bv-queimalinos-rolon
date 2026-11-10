import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { fake, supabase, reset, callsOf } from '../../../helpers/trainer-ai/supabase-fake.js';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/trainer-ai/ai-generations.repository.js'));
const { GENERATION_COLUMNS } = await import(src('models/trainer-ai/ai-generation.model.js'));

describe('ai-generations.repository', () => {
  beforeEach(reset);

  it('findGenerationTimesSince: created_at del trainer desde la fecha, más viejas primero, con tope', async () => {
    fake.result = { data: [{ created_at: '2026-11-06T11:00:00Z' }], error: null };
    await expect(repo.findGenerationTimesSince('t-1', '2026-11-06T11:00:00.000Z', 20)).resolves.toEqual([
      { created_at: '2026-11-06T11:00:00Z' },
    ]);
    expect(fake.tables).toEqual(['ai_routine_generations']);
    expect(callsOf('select')).toEqual([['created_at']]);
    expect(callsOf('eq')).toEqual([['trainer_id', 't-1']]);
    expect(callsOf('gte')).toEqual([['created_at', '2026-11-06T11:00:00.000Z']]);
    expect(callsOf('order')).toEqual([['created_at', { ascending: true }]]);
    expect(callsOf('limit')).toEqual([[20]]);
  });

  it('createGeneration inserta y devuelve la fila', async () => {
    fake.result = { data: { id: 'g-1' }, error: null };
    const fields = { trainer_id: 't-1', student_id: null, input_params: {}, generated_routine: {} };
    await expect(repo.createGeneration(fields)).resolves.toEqual({ id: 'g-1' });
    expect(callsOf('insert')).toEqual([[fields]]);
    expect(callsOf('select')).toEqual([[GENERATION_COLUMNS]]);
  });

  it('findGenerationById busca por id (null si no existe)', async () => {
    fake.result = { data: null, error: null };
    await expect(repo.findGenerationById('g-1')).resolves.toBeNull();
    expect(callsOf('eq')).toEqual([['id', 'g-1']]);
    expect(callsOf('maybeSingle')).toHaveLength(1);
  });

  it('un error de la base es 500', async () => {
    fake.result = { data: null, error: { message: 'boom' } };
    await expect(repo.findGenerationById('g-1')).rejects.toMatchObject({ statusCode: 500 });
  });

  describe('saveGenerationTemplates (RPC atómica)', () => {
    const templates = [{ name: 'A', goal: 'strength', level: null, frequency_per_week: 1, structure: {} }];

    it('llama a save_ai_generation_templates y devuelve las plantillas', async () => {
      fake.rpcResult = { data: [{ id: 'tp-1' }], error: null };
      await expect(repo.saveGenerationTemplates('g-1', 't-1', templates)).resolves.toEqual([{ id: 'tp-1' }]);
      expect(supabase.rpc).toHaveBeenCalledWith('save_ai_generation_templates', {
        p_generation_id: 'g-1',
        p_trainer_id: 't-1',
        p_templates: templates,
      });
    });

    it.each([
      ['FT002', 409, 'GENERATION_ALREADY_SAVED'],
      ['FT003', 404, 'GENERATION_NOT_FOUND'],
      ['XX000', 500, 'INTERNAL_ERROR'],
    ])('el error %s de la función es %i %s', async (code, statusCode, appCode) => {
      fake.rpcResult = { data: null, error: { code, message: 'x' } };
      await expect(repo.saveGenerationTemplates('g-1', 't-1', templates)).rejects.toMatchObject({
        statusCode,
        code: appCode,
      });
    });
  });
});
