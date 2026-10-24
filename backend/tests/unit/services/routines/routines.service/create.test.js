import {
  mockRepo,
  mockExercisesRepo,
  service,
  TRAINER_ID,
  ROUTINE,
  BODY,
} from '../../../../helpers/routines/routines-service.setup.js';

describe('routines.service', () => {
  // Por defecto todos los ejercicios pedidos son accesibles (globales o propios).
  beforeEach(() => {
    mockRepo.findAccessibleExerciseIds.mockImplementation(async (ids) => ids);
  });

  describe('create', () => {
    it('crea la rutina y sus ejercicios si el alumno es del trainer', async () => {
      mockRepo.isStudentOfTrainer.mockResolvedValue(true);
      mockRepo.createRoutine.mockResolvedValue(ROUTINE);
      mockRepo.addRoutineExercises.mockResolvedValue([{ id: 're-1', exercise_id: 'ex-1' }]);

      const result = await service.create(TRAINER_ID, BODY);

      expect(result.id).toBe('rt-1');
      expect(result.exercises).toHaveLength(1);
      expect(mockRepo.createRoutine.mock.calls[0][0].trainer_id).toBe(TRAINER_ID);
      expect(mockRepo.addRoutineExercises).toHaveBeenCalledWith('rt-1', BODY.exercises);
    });

    it('lanza FORBIDDEN si el alumno no es del trainer', async () => {
      mockRepo.isStudentOfTrainer.mockResolvedValue(false);
      await expect(service.create(TRAINER_ID, BODY)).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
      expect(mockRepo.createRoutine).not.toHaveBeenCalled();
    });

    it('no consulta plantillas si no viene template_id', async () => {
      mockRepo.isStudentOfTrainer.mockResolvedValue(true);
      mockRepo.createRoutine.mockResolvedValue(ROUTINE);
      mockRepo.addRoutineExercises.mockResolvedValue([]);

      await service.create(TRAINER_ID, BODY);

      expect(mockRepo.findTemplateById).not.toHaveBeenCalled();
      expect(mockRepo.createRoutine.mock.calls[0][0].template_id).toBeNull();
    });

    it('crea la rutina con template_id si la plantilla es del trainer', async () => {
      mockRepo.isStudentOfTrainer.mockResolvedValue(true);
      mockRepo.findTemplateById.mockResolvedValue({ id: 'tpl-1', trainer_id: TRAINER_ID });
      mockRepo.createRoutine.mockResolvedValue(ROUTINE);
      mockRepo.addRoutineExercises.mockResolvedValue([]);

      await service.create(TRAINER_ID, { ...BODY, template_id: 'tpl-1' });

      expect(mockRepo.findTemplateById).toHaveBeenCalledWith('tpl-1');
      expect(mockRepo.createRoutine.mock.calls[0][0].template_id).toBe('tpl-1');
    });

    it('lanza NOT_FOUND si la plantilla no existe', async () => {
      mockRepo.isStudentOfTrainer.mockResolvedValue(true);
      mockRepo.findTemplateById.mockResolvedValue(null);
      await expect(
        service.create(TRAINER_ID, { ...BODY, template_id: 'tpl-x' })
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.createRoutine).not.toHaveBeenCalled();
    });

    it('lanza FORBIDDEN si la plantilla es de otro trainer', async () => {
      mockRepo.isStudentOfTrainer.mockResolvedValue(true);
      mockRepo.findTemplateById.mockResolvedValue({ id: 'tpl-2', trainer_id: 'otro' });
      await expect(
        service.create(TRAINER_ID, { ...BODY, template_id: 'tpl-2' })
      ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
      expect(mockRepo.createRoutine).not.toHaveBeenCalled();
    });

    it('valida los ejercicios contra los accesibles del trainer', async () => {
      mockRepo.isStudentOfTrainer.mockResolvedValue(true);
      mockRepo.createRoutine.mockResolvedValue(ROUTINE);
      mockRepo.addRoutineExercises.mockResolvedValue([]);

      await service.create(TRAINER_ID, BODY);

      expect(mockRepo.findAccessibleExerciseIds).toHaveBeenCalledWith(['ex-1'], TRAINER_ID);
    });

    it('lanza FORBIDDEN si algún ejercicio es privado de otro trainer o no existe', async () => {
      mockRepo.isStudentOfTrainer.mockResolvedValue(true);
      mockRepo.findAccessibleExerciseIds.mockResolvedValue(['ex-1']);
      const body = {
        ...BODY,
        exercises: [...BODY.exercises, { exercise_id: 'ex-ajeno', sets: 3, reps: 10 }],
      };
      await expect(service.create(TRAINER_ID, body)).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
      expect(mockRepo.createRoutine).not.toHaveBeenCalled();
      expect(mockRepo.addRoutineExercises).not.toHaveBeenCalled();
    });

    describe('compensación si fallan los ejercicios', () => {
      beforeEach(() => {
        mockRepo.isStudentOfTrainer.mockResolvedValue(true);
        mockRepo.createRoutine.mockResolvedValue(ROUTINE);
      });

      it('borra la rutina y re-lanza el error original', async () => {
        const original = new Error('insert falló');
        mockRepo.addRoutineExercises.mockRejectedValue(original);
        mockExercisesRepo.deleteRoutine.mockResolvedValue();

        await expect(service.create(TRAINER_ID, BODY)).rejects.toBe(original);
        expect(mockExercisesRepo.deleteRoutine).toHaveBeenCalledWith('rt-1');
      });

      it('si la compensación también falla, sale el error original', async () => {
        const original = new Error('insert falló');
        mockRepo.addRoutineExercises.mockRejectedValue(original);
        mockExercisesRepo.deleteRoutine.mockRejectedValue(new Error('delete falló'));

        await expect(service.create(TRAINER_ID, BODY)).rejects.toBe(original);
      });
    });
  });
});
