import {
  mockRepo,
  service,
  TRAINER_ID,
  OWN_EXERCISE,
  GLOBAL_EXERCISE,
} from '../../../../helpers/exercises/exercises-service.setup.js';

describe('exercises.service', () => {
  describe('list', () => {
    it('delega en el repo con el trainer y los filtros', async () => {
      mockRepo.findExercises.mockResolvedValue([OWN_EXERCISE]);
      const result = await service.list(TRAINER_ID, { muscleGroup: 'chest', includeGlobal: true });
      expect(result).toEqual([OWN_EXERCISE]);
      expect(mockRepo.findExercises).toHaveBeenCalledWith({
        trainerId: TRAINER_ID,
        muscleGroup: 'chest',
        includeGlobal: true,
      });
    });
  });

  describe('create', () => {
    it('crea el ejercicio como propio y no global', async () => {
      mockRepo.createExercise.mockResolvedValue(OWN_EXERCISE);
      await service.create(TRAINER_ID, { name: 'Press banca', muscle_group: 'chest' });
      const arg = mockRepo.createExercise.mock.calls[0][0];
      expect(arg.trainer_id).toBe(TRAINER_ID);
      expect(arg.is_global).toBe(false);
    });
  });

  describe('update', () => {
    it('actualiza un ejercicio propio', async () => {
      mockRepo.findExerciseById.mockResolvedValue(OWN_EXERCISE);
      mockRepo.updateExercise.mockResolvedValue({ ...OWN_EXERCISE, name: 'Nuevo' });
      const result = await service.update(TRAINER_ID, 'ex-1', { name: 'Nuevo' });
      expect(result.name).toBe('Nuevo');
    });

    it('lanza NOT_FOUND si el ejercicio no existe', async () => {
      mockRepo.findExerciseById.mockResolvedValue(null);
      await expect(service.update(TRAINER_ID, 'x', { name: 'X' })).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockRepo.updateExercise).not.toHaveBeenCalled();
    });

    it('lanza FORBIDDEN si el ejercicio es global o de otro trainer', async () => {
      mockRepo.findExerciseById.mockResolvedValue(GLOBAL_EXERCISE);
      await expect(service.update(TRAINER_ID, 'ex-2', { name: 'X' })).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
      expect(mockRepo.updateExercise).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('elimina un ejercicio propio', async () => {
      mockRepo.findExerciseById.mockResolvedValue(OWN_EXERCISE);
      mockRepo.deleteExercise.mockResolvedValue();
      await service.remove(TRAINER_ID, 'ex-1');
      expect(mockRepo.deleteExercise).toHaveBeenCalledWith('ex-1');
    });

    it('lanza FORBIDDEN al intentar borrar uno ajeno/global', async () => {
      mockRepo.findExerciseById.mockResolvedValue(GLOBAL_EXERCISE);
      await expect(service.remove(TRAINER_ID, 'ex-2')).rejects.toMatchObject({ statusCode: 403 });
      expect(mockRepo.deleteExercise).not.toHaveBeenCalled();
    });
  });
});
