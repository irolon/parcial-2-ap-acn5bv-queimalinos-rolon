import {
  mockRepo,
  mockRoutineExercisesRepo,
  service,
  TRAINER_ID,
  ROUTINE,
} from '../../../../helpers/routines/routines-service.setup.js';

describe('routines.service', () => {
  // Por defecto todos los ejercicios pedidos son accesibles (globales o propios).
  beforeEach(() => {
    mockRepo.findAccessibleExerciseIds.mockImplementation(async (ids) => ids);
  });

  describe('findMissingExerciseIds', () => {
    it('devuelve los que faltan, en orden y sin repetir', async () => {
      mockRepo.findAccessibleExerciseIds.mockResolvedValue(['ex-1']);
      const missing = await service.findMissingExerciseIds(TRAINER_ID, ['ex-3', 'ex-1', 'ex-2', 'ex-3']);
      expect(missing).toEqual(['ex-3', 'ex-2']);
      expect(mockRepo.findAccessibleExerciseIds).toHaveBeenCalledWith(['ex-3', 'ex-1', 'ex-2'], TRAINER_ID);
    });

    it('sin ids no consulta la base', async () => {
      mockRepo.findAccessibleExerciseIds.mockClear();
      expect(await service.findMissingExerciseIds(TRAINER_ID, [])).toEqual([]);
      expect(mockRepo.findAccessibleExerciseIds).not.toHaveBeenCalled();
    });
  });

  describe('addExercises', () => {
    it('agrega ejercicios a una rutina propia', async () => {
      mockRepo.findRoutineById.mockResolvedValue(ROUTINE);
      mockRoutineExercisesRepo.findMaxOrderIndex.mockResolvedValue(-1);
      mockRepo.addRoutineExercises.mockResolvedValue([{ id: 're-2' }]);
      const result = await service.addExercises(TRAINER_ID, 'rt-1', [{ exercise_id: 'ex-2', sets: 3, reps: 10, order: 0 }]);
      expect(result).toHaveLength(1);
      expect(mockRepo.addRoutineExercises.mock.calls[0][1][0].order).toBe(0);
    });

    it('agrega después de los existentes: con máximo 3, los nuevos van en 4 y 5', async () => {
      mockRepo.findRoutineById.mockResolvedValue(ROUTINE);
      mockRoutineExercisesRepo.findMaxOrderIndex.mockResolvedValue(3);
      mockRepo.addRoutineExercises.mockResolvedValue([]);
      await service.addExercises(TRAINER_ID, 'rt-1', [
        { exercise_id: 'ex-2', sets: 3, reps: 10, order: 0 },
        { exercise_id: 'ex-3', sets: 3, reps: 10, order: 1 },
      ]);
      expect(mockRoutineExercisesRepo.findMaxOrderIndex).toHaveBeenCalledWith('rt-1');
      const sent = mockRepo.addRoutineExercises.mock.calls[0][1];
      expect(sent.map((e) => e.order)).toEqual([4, 5]);
    });

    it('lanza NOT_FOUND si la rutina no existe', async () => {
      mockRepo.findRoutineById.mockResolvedValue(null);
      await expect(service.addExercises(TRAINER_ID, 'x', [])).rejects.toMatchObject({ statusCode: 404 });
    });

    it('lanza FORBIDDEN si la rutina es de otro trainer', async () => {
      mockRepo.findRoutineById.mockResolvedValue({ ...ROUTINE, trainer_id: 'otro' });
      await expect(service.addExercises(TRAINER_ID, 'rt-1', [])).rejects.toMatchObject({ statusCode: 403 });
      expect(mockRepo.addRoutineExercises).not.toHaveBeenCalled();
    });

    it('lanza FORBIDDEN si algún ejercicio es privado de otro trainer o no existe', async () => {
      mockRepo.findRoutineById.mockResolvedValue(ROUTINE);
      mockRepo.findAccessibleExerciseIds.mockResolvedValue([]);
      await expect(
        service.addExercises(TRAINER_ID, 'rt-1', [{ exercise_id: 'ex-ajeno', sets: 3, reps: 10 }])
      ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
      expect(mockRepo.findAccessibleExerciseIds).toHaveBeenCalledWith(['ex-ajeno'], TRAINER_ID);
      expect(mockRepo.addRoutineExercises).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('devuelve el detalle con ejercicios si es propia', async () => {
      mockRepo.findRoutineByIdWithExercises.mockResolvedValue({
        ...ROUTINE,
        routine_exercises: [
          { id: 're-1', order_index: 0, sets: 4, reps: 8, exercise: { id: 'ex-1', name: 'Press' } },
        ],
      });
      const result = await service.getById(TRAINER_ID, 'rt-1');
      expect(result.id).toBe('rt-1');
      expect(result.exercises[0].exercise.name).toBe('Press');
    });

    it('lanza NOT_FOUND si no existe', async () => {
      mockRepo.findRoutineByIdWithExercises.mockResolvedValue(null);
      await expect(service.getById(TRAINER_ID, 'x')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('lanza FORBIDDEN si es de otro trainer', async () => {
      mockRepo.findRoutineByIdWithExercises.mockResolvedValue({ ...ROUTINE, trainer_id: 'otro', routine_exercises: [] });
      await expect(service.getById(TRAINER_ID, 'rt-1')).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
