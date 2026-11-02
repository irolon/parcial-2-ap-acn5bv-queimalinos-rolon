import {
  mockRepo,
  mockRoutineExercisesRepo,
  service,
  TRAINER_ID,
  ROUTINE,
} from '../../../../helpers/routines/routines-service.setup.js';

describe('routines.service — reorderExercises', () => {
  beforeEach(() => {
    mockRoutineExercisesRepo.reorderRoutineExercises.mockReset();
  });

  it('lanza NOT_FOUND si la rutina no existe', async () => {
    mockRepo.findRoutineById.mockResolvedValue(null);
    await expect(service.reorderExercises(TRAINER_ID, 'rt-x', ['re-1'])).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mockRoutineExercisesRepo.reorderRoutineExercises).not.toHaveBeenCalled();
  });

  it('lanza FORBIDDEN si la rutina es de otro trainer', async () => {
    mockRepo.findRoutineById.mockResolvedValue({ ...ROUTINE, trainer_id: 'otro' });
    await expect(service.reorderExercises(TRAINER_ID, 'rt-1', ['re-1'])).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockRoutineExercisesRepo.reorderRoutineExercises).not.toHaveBeenCalled();
  });

  it('400 si la función SQL rechaza el conjunto (falta, sobra o es ajeno): no se recarga nada', async () => {
    mockRepo.findRoutineById.mockResolvedValue(ROUTINE);
    mockRepo.findRoutineByIdWithExercises.mockClear();
    mockRoutineExercisesRepo.reorderRoutineExercises.mockResolvedValue(false);
    await expect(service.reorderExercises(TRAINER_ID, 'rt-1', ['re-1'])).rejects.toMatchObject({
      statusCode: 400,
      details: [expect.objectContaining({ field: 'routine_exercise_ids' })],
    });
    expect(mockRepo.findRoutineByIdWithExercises).not.toHaveBeenCalled();
  });

  it('un error de la base sale como error, no como éxito', async () => {
    mockRepo.findRoutineById.mockResolvedValue(ROUTINE);
    mockRoutineExercisesRepo.reorderRoutineExercises.mockRejectedValue(
      Object.assign(new Error('db'), { statusCode: 500 })
    );
    await expect(service.reorderExercises(TRAINER_ID, 'rt-1', ['re-2', 're-1'])).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it('guarda el orden recibido en una sola llamada y devuelve el detalle recargado', async () => {
    mockRepo.findRoutineById.mockResolvedValue(ROUTINE);
    mockRoutineExercisesRepo.reorderRoutineExercises.mockResolvedValue(true);
    mockRepo.findRoutineByIdWithExercises.mockResolvedValue({ ...ROUTINE, routine_exercises: [] });

    const result = await service.reorderExercises(TRAINER_ID, 'rt-1', ['re-2', 're-1']);

    expect(mockRoutineExercisesRepo.reorderRoutineExercises).toHaveBeenCalledTimes(1);
    expect(mockRoutineExercisesRepo.reorderRoutineExercises).toHaveBeenCalledWith('rt-1', ['re-2', 're-1']);
    expect(result).toMatchObject({ id: 'rt-1', exercises: [] });
  });
});
