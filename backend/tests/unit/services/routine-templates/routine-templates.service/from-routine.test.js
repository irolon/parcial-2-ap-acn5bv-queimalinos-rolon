import {
  mockRepo,
  mockRoutinesRepo,
  service,
  TRAINER_ID,
} from '../../../../helpers/routine-templates/routine-templates-service.setup.js';

const ROUTINE = {
  id: 'rt-1',
  trainer_id: TRAINER_ID,
  name: 'Full body',
  goal: 'hypertrophy',
  days: ['monday', 'thursday'],
  routine_exercises: [
    { id: 're-2', exercise: { id: 'ex-2' }, sets: 3, reps: 12, rest_seconds: 45, suggested_kg: 10, tempo: '3-1-1', notes: 'lento', order_index: 1 },
    { id: 're-1', exercise: { id: 'ex-1' }, sets: 4, reps: 8, rest_seconds: 90, suggested_kg: 60, tempo: null, notes: null, order_index: 0 },
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
          { exercise_id: 'ex-1', sets: 4, reps: 8, rest_seconds: 90, suggested_kg: 60, tempo: null, notes: null, order: 0 },
          { exercise_id: 'ex-2', sets: 3, reps: 12, rest_seconds: 45, suggested_kg: 10, tempo: '3-1-1', notes: 'lento', order: 1 },
        ],
      },
    });
  });

  it('usa name y level del body si vienen', async () => {
    mockRoutinesRepo.findRoutineByIdWithExercises.mockResolvedValue(ROUTINE);
    await service.createFromRoutine(TRAINER_ID, { routine_id: 'rt-1', name: 'Mi plantilla', level: 'advanced' });
    expect(mockRepo.createTemplate.mock.calls[0][0]).toMatchObject({ name: 'Mi plantilla', level: 'advanced' });
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
