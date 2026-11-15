import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { fake, reset, supabase, callsOf } from '../../../helpers/trainer-ai/supabase-fake.js';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/routine-templates/routine-templates.repository.js'));

const SUMMARY_COLUMNS =
  'id, trainer_id, name, goal, level, frequency_per_week, generated_by_ai, created_at, days, exercise_count';

describe('routine-templates.repository · findTemplates', () => {
  beforeEach(reset);

  it('lee de la vista de resumen, sin structure, solo las del trainer, más nuevas primero', async () => {
    fake.result = { data: [{ id: 'tp-1' }], error: null };
    await expect(repo.findTemplates({ trainerId: 't-1' })).resolves.toEqual([{ id: 'tp-1' }]);
    expect(fake.tables).toEqual(['routine_templates_summary']);
    expect(callsOf('select')).toEqual([[SUMMARY_COLUMNS]]);
    expect(callsOf('select')[0][0]).not.toMatch(/structure/);
    expect(callsOf('eq')).toEqual([['trainer_id', 't-1']]);
    expect(callsOf('order')).toEqual([['created_at', { ascending: false }]]);
    expect(callsOf('limit')).toEqual([]);
  });

  it('aplica los filtros opcionales después del de trainer', async () => {
    fake.result = { data: [], error: null };
    await repo.findTemplates({ trainerId: 't-1', goal: 'strength', level: 'beginner', generatedByAi: false });
    expect(callsOf('eq')).toEqual([
      ['trainer_id', 't-1'],
      ['goal', 'strength'],
      ['level', 'beginner'],
      ['generated_by_ai', false],
    ]);
  });

  it('un error de la base es 500', async () => {
    fake.result = { data: null, error: { message: 'relation does not exist' } };
    await expect(repo.findTemplates({ trainerId: 't-1' })).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe('routine-templates.repository · el detalle sigue leyendo la tabla con structure', () => {
  beforeEach(reset);

  it('findTemplateById', async () => {
    fake.result = { data: { id: 'tp-1' }, error: null };
    await repo.findTemplateById('tp-1');
    expect(fake.tables).toEqual(['routine_templates']);
    expect(callsOf('select')[0][0]).toMatch(/structure/);
  });
});
