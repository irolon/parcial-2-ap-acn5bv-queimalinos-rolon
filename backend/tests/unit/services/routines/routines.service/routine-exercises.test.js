import {
  mockRepo,
  mockRoutineExercisesRepo,
  service,
  TRAINER_ID,
  ROUTINE,
} from '../../../../helpers/routines/routines-service.setup.js';

describe('routines.service — ejercicios de una rutina asignada', () => {
  describe.each([
    ['updateExercise', (id) => service.updateExercise(TRAINER_ID, id, 're-1', { sets: 5 })],
    ['removeExercise', (id) => service.removeExercise(TRAINER_ID, id, 're-1')],
  ])('%s', (_name, run) => {
    it('lanza NOT_FOUND si la rutina no existe', async () => {
      mockRepo.findRoutineById.mockResolvedValue(null);
      await expect(run('rt-x')).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    });

    it('lanza FORBIDDEN si la rutina es de otro trainer', async () => {
      mockRepo.findRoutineById.mockResolvedValue({ ...ROUTINE, trainer_id: 'otro' });
      await expect(run('rt-1')).rejects.toMatchObject({ statusCode: 403 });
      expect(mockRoutineExercisesRepo.findRoutineExercise).not.toHaveBeenCalled();
    });

    it('lanza ROUTINE_EXERCISE_NOT_FOUND si el ejercicio no es de esa rutina', async () => {
      mockRepo.findRoutineById.mockResolvedValue(ROUTINE);
      mockRoutineExercisesRepo.findRoutineExercise.mockResolvedValue(null);
      await expect(run('rt-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'ROUTINE_EXERCISE_NOT_FOUND',
      });
      expect(mockRoutineExercisesRepo.findRoutineExercise).toHaveBeenCalledWith('rt-1', 're-1');
      expect(mockRoutineExercisesRepo.updateRoutineExercise).not.toHaveBeenCalled();
      expect(mockRoutineExercisesRepo.deleteRoutineExercise).not.toHaveBeenCalled();
    });
  });

  it('updateExercise actualiza y devuelve el detalle recargado', async () => {
    mockRepo.findRoutineById.mockResolvedValue(ROUTINE);
    mockRoutineExercisesRepo.findRoutineExercise.mockResolvedValue({ id: 're-1' });
    mockRepo.findRoutineByIdWithExercises.mockResolvedValue({ ...ROUTINE, routine_exercises: [] });

    const result = await service.updateExercise(TRAINER_ID, 'rt-1', 're-1', { sets: 5 });

    expect(mockRoutineExercisesRepo.updateRoutineExercise).toHaveBeenCalledWith('re-1', { sets: 5 });
    expect(result).toMatchObject({ id: 'rt-1', exercises: [] });
    expect(result.routine_exercises).toBeUndefined();
  });

  it('removeExercise borra el ejercicio de la rutina', async () => {
    mockRepo.findRoutineById.mockResolvedValue(ROUTINE);
    mockRoutineExercisesRepo.findRoutineExercise.mockResolvedValue({ id: 're-1' });
    await service.removeExercise(TRAINER_ID, 'rt-1', 're-1');
    expect(mockRoutineExercisesRepo.deleteRoutineExercise).toHaveBeenCalledWith('re-1');
  });
});
