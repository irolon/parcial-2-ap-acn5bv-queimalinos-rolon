import {
  mockRepo,
  mockRoutinesRepo,
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
    mockRoutinesRepo.findAccessibleExerciseIds.mockImplementation(async (ids) => ids);
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
      details: [expect.objectContaining({ field: 'structure.exercises' })],
    });
    expect(mockRepo.createTemplate).not.toHaveBeenCalled();
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
