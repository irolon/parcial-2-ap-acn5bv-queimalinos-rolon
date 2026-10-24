import {
  mockRepo,
  mockRoutinesRepo,
  mockRoutinesService,
  service,
  TRAINER_ID,
  TEMPLATE,
  STRUCTURE,
} from '../../../../helpers/routine-templates/routine-templates-service.setup.js';

const DETAIL_ROW = { id: 'rt-9', trainer_id: TRAINER_ID, name: 'Fuerza', goal: 'strength', days: ['monday'], routine_exercises: [] };

describe('routine-templates.service (instantiate)', () => {
  beforeEach(() => {
    mockRepo.findTemplateById.mockResolvedValue(TEMPLATE);
    mockRoutinesRepo.isStudentOfTrainer.mockResolvedValue(true);
    mockRoutinesRepo.findAccessibleExerciseIds.mockImplementation(async (ids) => ids);
    mockRoutinesService.createWithExercises.mockResolvedValue({ id: 'rt-9' });
    mockRoutinesRepo.findRoutineByIdWithExercises.mockResolvedValue(DETAIL_ROW);
  });

  it('404 si la plantilla es de otro trainer o no existe', async () => {
    mockRepo.findTemplateById.mockResolvedValue({ ...TEMPLATE, trainer_id: 'otro' });
    await expect(service.instantiate(TRAINER_ID, 'tp-1', { student_id: 's-1' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'TEMPLATE_NOT_FOUND',
    });
    mockRepo.findTemplateById.mockResolvedValue(null);
    await expect(service.instantiate(TRAINER_ID, 'tp-1', { student_id: 's-1' })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mockRoutinesService.createWithExercises).not.toHaveBeenCalled();
  });

  it('403 si el alumno no es del trainer', async () => {
    mockRoutinesRepo.isStudentOfTrainer.mockResolvedValue(false);
    await expect(service.instantiate(TRAINER_ID, 'tp-1', { student_id: 's-1' })).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockRoutinesService.createWithExercises).not.toHaveBeenCalled();
  });

  it('409 con los ids faltantes si algún ejercicio ya no está disponible', async () => {
    mockRoutinesRepo.findAccessibleExerciseIds.mockResolvedValue([]);
    await expect(service.instantiate(TRAINER_ID, 'tp-1', { student_id: 's-1' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'TEMPLATE_EXERCISES_UNAVAILABLE',
      details: [{ field: 'exercise_id', message: 'ex-1' }],
    });
    expect(mockRoutinesService.createWithExercises).not.toHaveBeenCalled();
  });

  it('crea la copia con template_id, goal, name y days de la plantilla', async () => {
    const detail = await service.instantiate(TRAINER_ID, 'tp-1', { student_id: 's-1' });
    expect(mockRoutinesService.createWithExercises).toHaveBeenCalledWith(
      {
        trainer_id: TRAINER_ID,
        student_id: 's-1',
        template_id: 'tp-1',
        name: 'Fuerza',
        goal: 'strength',
        days: STRUCTURE.days,
        active: true,
      },
      STRUCTURE.exercises
    );
    expect(mockRoutinesRepo.findRoutineByIdWithExercises).toHaveBeenCalledWith('rt-9');
    expect(detail).toMatchObject({ id: 'rt-9', name: 'Fuerza' });
  });

  it('usa name y days del body si vienen', async () => {
    await service.instantiate(TRAINER_ID, 'tp-1', { student_id: 's-1', name: 'Para Ana', days: ['friday'] });
    expect(mockRoutinesService.createWithExercises.mock.calls[0][0]).toMatchObject({
      name: 'Para Ana',
      days: ['friday'],
    });
  });

  it('instanciar dos veces crea dos rutinas y no toca la plantilla', async () => {
    await service.instantiate(TRAINER_ID, 'tp-1', { student_id: 's-1' });
    await service.instantiate(TRAINER_ID, 'tp-1', { student_id: 's-2' });
    expect(mockRoutinesService.createWithExercises).toHaveBeenCalledTimes(2);
    expect(mockRepo.updateTemplate).not.toHaveBeenCalled();
    expect(mockRepo.deleteTemplate).not.toHaveBeenCalled();
  });
});
