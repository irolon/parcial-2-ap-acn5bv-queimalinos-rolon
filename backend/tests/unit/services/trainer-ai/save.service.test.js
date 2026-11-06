import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  saveService,
  mockGenerationsRepo,
  mockRoutinesService,
  TRAINER_ID,
  OTHER_TRAINER,
  GENERATION_ID,
  GENERATION,
  TWO_BLOCKS,
  EX1,
  EX2,
} from '../../../helpers/trainer-ai/trainer-ai-service.setup.js';

const BODY = { generation_id: GENERATION_ID, template_name: 'Fuerza' };
const saved = (templates) => templates.map((t, i) => ({ id: `tp-${i + 1}`, ...t, generated_by_ai: true }));

describe('trainer-ai · save.service · saveAsTemplate', () => {
  beforeEach(() => {
    mockGenerationsRepo.findGenerationById.mockResolvedValue(GENERATION);
    mockRoutinesService.findMissingExerciseIds.mockResolvedValue([]);
    mockGenerationsRepo.saveGenerationTemplates.mockImplementation(async (_g, _t, templates) => saved(templates));
  });

  it('1 bloque → 1 plantilla con el nombre del PT, goal/level de la generación y structure v1', async () => {
    const data = await saveService.saveAsTemplate(TRAINER_ID, BODY);
    const [, trainerId, templates] = mockGenerationsRepo.saveGenerationTemplates.mock.calls[0];
    expect(trainerId).toBe(TRAINER_ID);
    expect(templates).toHaveLength(1);
    expect(templates[0]).toMatchObject({ name: 'Fuerza', goal: 'hypertrophy', level: 'beginner', frequency_per_week: 2 });
    expect(templates[0].structure).toMatchObject({ version: 1, days: ['monday', 'thursday'] });
    expect(templates[0].structure.exercises.map((e) => [e.exercise_id, e.order])).toEqual([[EX1, 0], [EX2, 1]]);
    expect(data).toEqual({
      generation_id: GENERATION_ID,
      templates: [{ id: 'tp-1', name: 'Fuerza', days: ['monday', 'thursday'] }],
    });
  });

  it('varios bloques → una plantilla por bloque, "<nombre> · <bloque>"', async () => {
    mockGenerationsRepo.findGenerationById.mockResolvedValue({ ...GENERATION, generated_routine: TWO_BLOCKS });
    const data = await saveService.saveAsTemplate(TRAINER_ID, BODY);
    expect(data.templates).toEqual([
      { id: 'tp-1', name: 'Fuerza · Empuje', days: ['monday'] },
      { id: 'tp-2', name: 'Fuerza · Tirón', days: ['wednesday', 'friday'] },
    ]);
    const templates = mockGenerationsRepo.saveGenerationTemplates.mock.calls[0][2];
    expect(templates.map((t) => t.frequency_per_week)).toEqual([1, 2]);
  });

  it('el nombre compuesto se corta a 120', async () => {
    mockGenerationsRepo.findGenerationById.mockResolvedValue({ ...GENERATION, generated_routine: TWO_BLOCKS });
    await saveService.saveAsTemplate(TRAINER_ID, { ...BODY, template_name: 'x'.repeat(120) });
    const templates = mockGenerationsRepo.saveGenerationTemplates.mock.calls[0][2];
    expect(templates.every((t) => t.name.length === 120)).toBe(true);
  });

  it.each([
    ['no existe', null],
    ['es de otro trainer', { ...GENERATION, trainer_id: OTHER_TRAINER }],
  ])('404 GENERATION_NOT_FOUND si la generación %s', async (_label, row) => {
    mockGenerationsRepo.findGenerationById.mockResolvedValue(row);
    await expect(saveService.saveAsTemplate(TRAINER_ID, BODY)).rejects.toMatchObject({ statusCode: 404, code: 'GENERATION_NOT_FOUND' });
    expect(mockGenerationsRepo.saveGenerationTemplates).not.toHaveBeenCalled();
  });

  it('409 GENERATION_ALREADY_SAVED si ya se guardó', async () => {
    mockGenerationsRepo.findGenerationById.mockResolvedValue({ ...GENERATION, was_used: true });
    await expect(saveService.saveAsTemplate(TRAINER_ID, BODY)).rejects.toMatchObject({ statusCode: 409, code: 'GENERATION_ALREADY_SAVED' });
    expect(mockGenerationsRepo.saveGenerationTemplates).not.toHaveBeenCalled();
  });

  it('un ejercicio que ya no existe o no es accesible → 400 TEMPLATE_EXERCISES_UNAVAILABLE sin crear nada', async () => {
    mockRoutinesService.findMissingExerciseIds.mockResolvedValue([EX2]);
    await expect(saveService.saveAsTemplate(TRAINER_ID, BODY)).rejects.toMatchObject({
      statusCode: 400,
      code: 'TEMPLATE_EXERCISES_UNAVAILABLE',
      details: [{ field: 'exercise_id', message: EX2 }],
    });
    expect(mockRoutinesService.findMissingExerciseIds).toHaveBeenCalledWith(TRAINER_ID, [EX1, EX2]);
    expect(mockGenerationsRepo.saveGenerationTemplates).not.toHaveBeenCalled();
  });
});
