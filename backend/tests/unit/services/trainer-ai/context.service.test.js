import { describe, it, expect, beforeEach } from '@jest/globals';
import { Errors } from '../../../../src/shared/utils/errors.js';
import {
  contextService,
  mockStudentsRepo,
  mockContextRepo,
  mockTemplatesRepo,
  mockTemplatesService,
  TRAINER_ID,
  OTHER_TRAINER,
  STUDENT_ID,
  TEMPLATE_ID,
  STUDENT,
  LIBRARY,
  EX1,
  EX2,
} from '../../../helpers/trainer-ai/trainer-ai-service.setup.js';

const BODY = { goal: 'hypertrophy', level: 'beginner', frequency_per_week: 3, session_duration_min: 60 };

describe('trainer-ai · context.service · resolveParams', () => {
  it('sin alumno usa el body; sin equipamiento queda solo bodyweight', async () => {
    await expect(contextService.resolveParams(TRAINER_ID, BODY)).resolves.toEqual({
      ...BODY,
      available_equipment: ['bodyweight'],
      injuries: null,
      preferences: null,
    });
    expect(mockStudentsRepo.findStudentById).not.toHaveBeenCalled();
  });

  it('completa goal, level, equipamiento y lesiones con los datos del alumno', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    const params = await contextService.resolveParams(TRAINER_ID, { student_id: STUDENT_ID, frequency_per_week: 2, session_duration_min: 60 });
    expect(params).toEqual({
      goal: 'strength',
      level: 'intermediate',
      frequency_per_week: 2,
      session_duration_min: 60,
      available_equipment: ['barbell', 'dumbbell'],
      injuries: 'Hombro derecho',
      preferences: null,
    });
  });

  it('lo que viene en el body pisa al alumno (incluso equipamiento vacío → bodyweight)', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    const params = await contextService.resolveParams(TRAINER_ID, {
      ...BODY,
      student_id: STUDENT_ID,
      available_equipment: [],
      injuries: 'Rodilla',
    });
    expect(params).toMatchObject({ goal: 'hypertrophy', level: 'beginner', available_equipment: ['bodyweight'], injuries: 'Rodilla' });
  });

  it('descarta equipamiento del alumno que no es de la lista', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue({ ...STUDENT, gym_equipment: ['rack', 'band'] });
    const params = await contextService.resolveParams(TRAINER_ID, { student_id: STUDENT_ID, frequency_per_week: 2 });
    expect(params.available_equipment).toEqual(['band']);
  });

  it.each([
    ['no existe', null],
    ['es de otro trainer', { ...STUDENT, trainer_id: OTHER_TRAINER }],
    ['está dado de baja', { ...STUDENT, active: false }],
  ])('404 STUDENT_NOT_FOUND si el alumno %s', async (_label, row) => {
    mockStudentsRepo.findStudentById.mockResolvedValue(row);
    await expect(contextService.resolveParams(TRAINER_ID, { student_id: STUDENT_ID, frequency_per_week: 2 }))
      .rejects.toMatchObject({ statusCode: 404, code: 'STUDENT_NOT_FOUND' });
  });

  it('400 si ni el body ni el alumno tienen goal o level', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue({ ...STUDENT, goal: null, level: null });
    await expect(contextService.resolveParams(TRAINER_ID, { student_id: STUDENT_ID, frequency_per_week: 2 }))
      .rejects.toMatchObject({ statusCode: 400, details: [{ field: 'goal' }, { field: 'level' }].map(expect.objectContaining) });
  });
});

describe('trainer-ai · context.service · buildContext', () => {
  const PARAMS = { goal: 'strength', level: 'beginner', frequency_per_week: 2, available_equipment: ['barbell'] };
  const TEMPLATE = { name: 'Previa', goal: 'strength', level: null, structure: { days: ['monday'], exercises: [{ exercise_id: EX1, sets: 3, reps: 10 }] } };

  beforeEach(() => {
    mockContextRepo.findLibraryForEquipment.mockResolvedValue(LIBRARY);
    mockContextRepo.findRecentTemplates.mockResolvedValue([TEMPLATE]);
    mockTemplatesRepo.findExercisesByIds.mockResolvedValue([{ id: EX1, name: 'Press banca plano' }, { id: EX2, name: 'Flexiones' }]);
  });

  it('filtra la biblioteca por el equipamiento resuelto más bodyweight', async () => {
    const context = await contextService.buildContext(TRAINER_ID, PARAMS);
    expect(mockContextRepo.findLibraryForEquipment).toHaveBeenCalledWith(TRAINER_ID, ['barbell', 'bodyweight']);
    expect(context.library).toEqual(LIBRARY);
  });

  it('previous_templates con nombre, goal, level, días y nombres de ejercicios; sin base → null', async () => {
    const context = await contextService.buildContext(TRAINER_ID, PARAMS);
    expect(context.previous_templates).toEqual([
      { name: 'Previa', goal: 'strength', level: null, days: ['monday'], exercise_names: ['Press banca plano'] },
    ]);
    expect(context.base_template).toBeNull();
  });

  it('base_template: la estructura de la plantilla propia con los nombres de sus ejercicios', async () => {
    mockTemplatesService.getOwnedTemplate.mockResolvedValue({ id: TEMPLATE_ID, ...TEMPLATE, structure: { days: ['friday'], exercises: [{ exercise_id: EX2, sets: 3, reps: 12, rest_seconds: 60 }] } });
    const context = await contextService.buildContext(TRAINER_ID, PARAMS, TEMPLATE_ID);
    expect(mockTemplatesService.getOwnedTemplate).toHaveBeenCalledWith(TRAINER_ID, TEMPLATE_ID);
    expect(context.base_template).toEqual({
      name: 'Previa',
      goal: 'strength',
      level: null,
      days: ['friday'],
      exercises: [{ exercise_id: EX2, exercise_name: 'Flexiones', sets: 3, reps: 12, rest_seconds: 60, suggested_kg: null, notes: null }],
    });
  });

  it('una plantilla base ajena o inexistente es 404 TEMPLATE_NOT_FOUND', async () => {
    mockTemplatesService.getOwnedTemplate.mockRejectedValue(Errors.templateNotFound());
    await expect(contextService.buildContext(TRAINER_ID, PARAMS, TEMPLATE_ID)).rejects.toMatchObject({ statusCode: 404, code: 'TEMPLATE_NOT_FOUND' });
  });
});
