import {
  mockRepo,
  mockRoutinesRepo,
  mockRoutinesService,
  service,
  TRAINER_ID,
} from '../../../../helpers/routine-templates/routine-templates-service.setup.js';

const EX1 = '3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c';
const EX2 = '3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4d';
const ROUTINE = {
  id: 'rt-1',
  trainer_id: TRAINER_ID,
  name: 'Full body',
  goal: 'hypertrophy',
  days: ['monday', 'thursday'],
  routine_exercises: [
    { id: 're-2', exercise: { id: EX2 }, sets: 3, reps: 12, rest_seconds: 45, suggested_kg: 10, tempo: '3-1-1', notes: 'lento', order_index: 1 },
    { id: 're-1', exercise: { id: EX1 }, sets: 4, reps: 8, rest_seconds: 90, suggested_kg: 60, tempo: null, notes: null, order_index: 0 },
  ],
};

describe('routine-templates.service (createFromRoutine)', () => {
  beforeEach(() => {
    mockRoutinesService.assertExercisesAccessible.mockResolvedValue();
    mockRepo.createTemplate.mockImplementation(async (f) => ({ id: 'tp-1', ...f }));
  });

  it('copia goal, days y ejercicios, y usa el nombre de la rutina por defecto', async () => {
    mockRoutinesRepo.findRoutineByIdWithExercises.mockResolvedValue(ROUTINE);
    await service.createFromRoutine(TRAINER_ID, { routine_id: 'rt-1' });
    expect(mockRepo.createTemplate).toHaveBeenCalledWith({
      trainer_id: TRAINER_ID,
      name: 'Full body',
      goal: 'hypertrophy',
      level: null,
      frequency_per_week: 2,
      generated_by_ai: false,
      structure: {
        version: 1,
        days: ['monday', 'thursday'],
        exercises: [
          { exercise_id: EX1, sets: 4, reps: 8, rest_seconds: 90, suggested_kg: 60, tempo: null, notes: null, order: 0 },
          { exercise_id: EX2, sets: 3, reps: 12, rest_seconds: 45, suggested_kg: 10, tempo: '3-1-1', notes: 'lento', order: 1 },
        ],
      },
    });
  });

  it('usa name y level del body si vienen', async () => {
    mockRoutinesRepo.findRoutineByIdWithExercises.mockResolvedValue(ROUTINE);
    await service.createFromRoutine(TRAINER_ID, { routine_id: 'rt-1', name: 'Mi plantilla', level: 'advanced' });
    expect(mockRepo.createTemplate.mock.calls[0][0]).toMatchObject({ name: 'Mi plantilla', level: 'advanced' });
  });

  it('400 field goal si la rutina no tiene objetivo y el body no trae uno', async () => {
    mockRoutinesRepo.findRoutineByIdWithExercises.mockResolvedValue({ ...ROUTINE, goal: null });
    await expect(service.createFromRoutine(TRAINER_ID, { routine_id: 'rt-1' })).rejects.toMatchObject({
      statusCode: 400,
      details: [{ field: 'goal', message: 'Elegí un objetivo para la plantilla' }],
    });
    expect(mockRepo.createTemplate).not.toHaveBeenCalled();
  });

  it('usa el goal del body si la rutina no tiene objetivo', async () => {
    mockRoutinesRepo.findRoutineByIdWithExercises.mockResolvedValue({ ...ROUTINE, goal: null });
    await service.createFromRoutine(TRAINER_ID, { routine_id: 'rt-1', goal: 'strength' });
    expect(mockRepo.createTemplate.mock.calls[0][0]).toMatchObject({ goal: 'strength' });
  });

  it('el goal del body pisa el de la rutina', async () => {
    mockRoutinesRepo.findRoutineByIdWithExercises.mockResolvedValue(ROUTINE);
    await service.createFromRoutine(TRAINER_ID, { routine_id: 'rt-1', goal: 'strength' });
    expect(mockRepo.createTemplate.mock.calls[0][0]).toMatchObject({ goal: 'strength' });
  });

  it('deduplica días repetidos y guarda frecuencia 1', async () => {
    mockRoutinesRepo.findRoutineByIdWithExercises.mockResolvedValue({ ...ROUTINE, days: ['monday', 'monday'] });
    await service.createFromRoutine(TRAINER_ID, { routine_id: 'rt-1' });
    const saved = mockRepo.createTemplate.mock.calls[0][0];
    expect(saved.structure.days).toEqual(['monday']);
    expect(saved.frequency_per_week).toBe(1);
  });

  it('400 si la rutina no tiene ejercicios', async () => {
    mockRoutinesRepo.findRoutineByIdWithExercises.mockResolvedValue({ ...ROUTINE, routine_exercises: [] });
    await expect(service.createFromRoutine(TRAINER_ID, { routine_id: 'rt-1' })).rejects.toMatchObject({
      statusCode: 400,
      details: [
        { field: 'routine_id', message: 'La rutina tiene que tener entre 1 y 50 ejercicios' },
      ],
    });
    expect(mockRepo.createTemplate).not.toHaveBeenCalled();
  });

  it('traduce los errores de la structure a términos de la rutina (field routine_id)', async () => {
    const routine_exercises = [
      ROUTINE.routine_exercises[1],
      { ...ROUTINE.routine_exercises[0], order_index: 1, notes: 'x'.repeat(501) },
    ];
    mockRoutinesRepo.findRoutineByIdWithExercises.mockResolvedValue({ ...ROUTINE, routine_exercises });
    await expect(service.createFromRoutine(TRAINER_ID, { routine_id: 'rt-1' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [
        {
          field: 'routine_id',
          message: 'El ejercicio 2 de la rutina: notes debe tener como máximo 500 caracteres',
        },
      ],
    });
    expect(mockRepo.createTemplate).not.toHaveBeenCalled();
  });

  it('traduce los días inválidos de la rutina', async () => {
    mockRoutinesRepo.findRoutineByIdWithExercises.mockResolvedValue({ ...ROUTINE, days: [] });
    await expect(service.createFromRoutine(TRAINER_ID, { routine_id: 'rt-1' })).rejects.toMatchObject({
      details: [{ field: 'routine_id', message: expect.stringMatching(/^Los días de la rutina: /) }],
    });
  });

  it('400 si la rutina tiene más de 50 ejercicios', async () => {
    const many = Array.from({ length: 51 }, (_, i) => ({
      id: `re-${i}`, exercise: { id: `3f1c2b9a-1d2e-4f5a-8b7c-${String(i).padStart(12, '0')}` }, sets: 3, reps: 10, rest_seconds: null, suggested_kg: null, tempo: null, notes: null, order_index: i,
    }));
    mockRoutinesRepo.findRoutineByIdWithExercises.mockResolvedValue({ ...ROUTINE, routine_exercises: many });
    await expect(service.createFromRoutine(TRAINER_ID, { routine_id: 'rt-1' })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockRepo.createTemplate).not.toHaveBeenCalled();
  });

  it('403 si la rutina es de otro trainer', async () => {
    mockRoutinesRepo.findRoutineByIdWithExercises.mockResolvedValue({ ...ROUTINE, trainer_id: 'otro' });
    await expect(service.createFromRoutine(TRAINER_ID, { routine_id: 'rt-1' })).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockRepo.createTemplate).not.toHaveBeenCalled();
  });

  it('404 si la rutina no existe', async () => {
    mockRoutinesRepo.findRoutineByIdWithExercises.mockResolvedValue(null);
    await expect(service.createFromRoutine(TRAINER_ID, { routine_id: 'x' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
