import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { Errors } from '../../../../src/shared/utils/errors.js';
import { generationLimiter } from '../../../../src/services/trainer-ai/generation-limiter.js';
import {
  generateService,
  mockGenerationsRepo,
  mockContextRepo,
  mockStudentsRepo,
  mockTemplatesRepo,
  mockTemplatesService,
  mockClient,
  TRAINER_ID,
  STUDENT_ID,
  TEMPLATE_ID,
  GENERATION_ID,
  STUDENT,
  LIBRARY,
  ONE_BLOCK,
  EX1,
} from '../../../helpers/trainer-ai/trainer-ai-service.setup.js';

const NOW = new Date('2026-11-06T12:00:00Z');
const BODY = { goal: 'hypertrophy', level: 'beginner', frequency_per_week: 2, session_duration_min: 60 };
const PARAMS = { ...BODY, available_equipment: ['bodyweight'], injuries: null, preferences: null };

describe('trainer-ai · generate.service · generateRoutine', () => {
  let warn;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    generationLimiter.clear();
    mockGenerationsRepo.findGenerationTimesSince.mockResolvedValue([]);
    mockGenerationsRepo.createGeneration.mockImplementation(async (f) => ({ id: GENERATION_ID, ...f }));
    mockContextRepo.findLibraryForEquipment.mockResolvedValue(LIBRARY);
    mockContextRepo.findRecentTemplates.mockResolvedValue([]);
    mockContextRepo.findLibraryByIds.mockResolvedValue([]);
    mockTemplatesRepo.findExercisesByIds.mockResolvedValue([]);
    mockClient.requestRoutineProposal.mockResolvedValue(ONE_BLOCK);
  });
  afterEach(() => warn.mockRestore());

  it('manda a n8n params, library, previous_templates y base_template', async () => {
    await generateService.generateRoutine(TRAINER_ID, BODY, NOW);
    expect(mockClient.requestRoutineProposal).toHaveBeenCalledWith({
      params: PARAMS,
      library: LIBRARY,
      previous_templates: [],
      base_template: null,
    });
  });

  it('el payload no trae datos personales del alumno (name, email, birth_date)', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    await generateService.generateRoutine(TRAINER_ID, { student_id: STUDENT_ID, frequency_per_week: 2, session_duration_min: 60 }, NOW);
    const sent = JSON.stringify(mockClient.requestRoutineProposal.mock.calls[0][0]);
    for (const value of [STUDENT.name, STUDENT.email, STUDENT.birth_date, STUDENT_ID]) expect(sent).not.toContain(value);
    for (const key of ['"name":"Lucía', '"email"', '"birth_date"', '"student_id"']) expect(sent).not.toContain(key);
  });

  it('ningún nombre de plantilla (previas ni base) llega al payload: los PT les ponen el nombre del alumno', async () => {
    const template = (name) => ({ name, goal: 'strength', level: null, structure: { days: ['monday'], exercises: [] } });
    mockContextRepo.findRecentTemplates.mockResolvedValue([template('Rutina de Lucía Pérez')]);
    mockTemplatesService.getOwnedTemplate.mockResolvedValue(template('Plan Juan Gómez'));
    await generateService.generateRoutine(TRAINER_ID, { ...BODY, base_template_id: TEMPLATE_ID }, NOW);
    const sent = mockClient.requestRoutineProposal.mock.calls[0][0];
    expect(JSON.stringify(sent)).not.toMatch(/Lucía|Juan/);
    expect(sent.previous_templates[0]).not.toHaveProperty('name');
    expect(sent.base_template).not.toHaveProperty('name');
  });

  it('guarda la generación (params resueltos sin la biblioteca) y devuelve la propuesta con nombres', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    const data = await generateService.generateRoutine(TRAINER_ID, { ...BODY, student_id: STUDENT_ID }, NOW);
    expect(mockGenerationsRepo.createGeneration).toHaveBeenCalledWith({
      trainer_id: TRAINER_ID,
      student_id: STUDENT_ID,
      input_params: { ...PARAMS, available_equipment: ['barbell', 'dumbbell'], injuries: 'Hombro derecho', base_template_id: null },
      generated_routine: ONE_BLOCK,
    });
    expect(data.generation_id).toBe(GENERATION_ID);
    expect(data.routine_proposal.rationale).toBe('Base de fuerza');
    expect(data.routine_proposal.routines[0].exercises[0]).toEqual({
      exercise_id: EX1,
      exercise_name: 'Press banca plano',
      sets: 4,
      reps: 8,
      rest_seconds: 90,
      suggested_kg: null,
      notes: null,
    });
  });

  it('una propuesta inválida es 502 y no se guarda', async () => {
    mockClient.requestRoutineProposal.mockResolvedValue({ error: 'INVALID_JSON' });
    await expect(generateService.generateRoutine(TRAINER_ID, BODY, NOW)).rejects.toMatchObject({ statusCode: 502, code: 'AI_INVALID_RESPONSE' });
    expect(mockGenerationsRepo.createGeneration).not.toHaveBeenCalled();
  });

  it('si n8n no está disponible es 503 y no se guarda', async () => {
    mockClient.requestRoutineProposal.mockRejectedValue(Errors.aiUnavailable());
    await expect(generateService.generateRoutine(TRAINER_ID, BODY, NOW)).rejects.toMatchObject({ statusCode: 503 });
    expect(mockGenerationsRepo.createGeneration).not.toHaveBeenCalled();
  });

  describe('límite de 20 por hora', () => {
    it('cuenta las de la última hora del trainer', async () => {
      await generateService.generateRoutine(TRAINER_ID, BODY, NOW);
      expect(mockGenerationsRepo.findGenerationTimesSince).toHaveBeenCalledWith(TRAINER_ID, '2026-11-06T11:00:00.000Z', 20);
    });

    it('con 19 en la última hora todavía genera', async () => {
      mockGenerationsRepo.findGenerationTimesSince.mockResolvedValue(Array(19).fill({ created_at: '2026-11-06T11:30:00Z' }));
      await expect(generateService.generateRoutine(TRAINER_ID, BODY, NOW)).resolves.toBeDefined();
    });

    it('con 20 → 429 con Retry-After hasta que la más vieja salga de la hora, sin llamar a n8n', async () => {
      const rows = [{ created_at: '2026-11-06T11:10:00Z' }, ...Array(19).fill({ created_at: '2026-11-06T11:50:00Z' })];
      mockGenerationsRepo.findGenerationTimesSince.mockResolvedValue(rows);
      await expect(generateService.generateRoutine(TRAINER_ID, BODY, NOW)).rejects.toMatchObject({
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        headers: { 'Retry-After': '600' },
      });
      expect(mockClient.requestRoutineProposal).not.toHaveBeenCalled();
    });

    it('los intentos fallidos también cuentan: 20 fallas seguidas → la 21 es 429 sin llamar a n8n', async () => {
      mockClient.requestRoutineProposal.mockRejectedValue(Errors.aiUnavailable());
      for (let i = 0; i < 20; i += 1) {
        await expect(generateService.generateRoutine(TRAINER_ID, BODY, NOW)).rejects.toMatchObject({ statusCode: 503 });
      }
      await expect(generateService.generateRoutine(TRAINER_ID, BODY, NOW)).rejects.toMatchObject({ statusCode: 429 });
      expect(mockClient.requestRoutineProposal).toHaveBeenCalledTimes(20);
    });
  });

  describe('una generación en curso por trainer', () => {
    it('una segunda request mientras la primera espera a n8n → 429 sin llamar a n8n; al terminar se libera', async () => {
      let answer;
      mockClient.requestRoutineProposal.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
      const first = generateService.generateRoutine(TRAINER_ID, BODY, NOW);
      await expect(generateService.generateRoutine(TRAINER_ID, BODY, NOW)).rejects.toMatchObject({
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: expect.stringContaining('Ya hay una propuesta en curso'),
      });
      answer(ONE_BLOCK);
      await expect(first).resolves.toBeDefined();
      await expect(generateService.generateRoutine(TRAINER_ID, BODY, NOW)).resolves.toBeDefined();
      expect(mockClient.requestRoutineProposal).toHaveBeenCalledTimes(2);
    });

    it('si la generación falla también se libera', async () => {
      mockClient.requestRoutineProposal.mockRejectedValueOnce(Errors.aiUnavailable());
      await expect(generateService.generateRoutine(TRAINER_ID, BODY, NOW)).rejects.toMatchObject({ statusCode: 503 });
      await expect(generateService.generateRoutine(TRAINER_ID, BODY, NOW)).resolves.toBeDefined();
    });
  });
});
