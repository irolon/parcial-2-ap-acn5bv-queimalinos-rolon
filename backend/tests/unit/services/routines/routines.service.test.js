import { jest } from '@jest/globals';

const mockRepo = {
  isStudentOfTrainer: jest.fn(),
  findTemplateById: jest.fn(),
  createRoutine: jest.fn(),
  addRoutineExercises: jest.fn(),
  findRoutinesByTrainer: jest.fn(),
  findRoutineById: jest.fn(),
  findRoutineByIdWithExercises: jest.fn(),
  updateRoutine: jest.fn(),
  findActiveRoutineForStudentToday: jest.fn(),
};
jest.unstable_mockModule(
  '../../../../src/repositories/routines/routines.repository.js',
  () => mockRepo
);

const service = await import('../../../../src/services/routines/routines.service.js');

const TRAINER_ID = 'trainer-1';
const ROUTINE = { id: 'rt-1', trainer_id: TRAINER_ID, student_id: 'st-1', name: 'Full body', goal: 'hypertrophy', days: ['monday'] };
const BODY = {
  student_id: 'st-1',
  name: 'Full body',
  goal: 'hypertrophy',
  days: ['monday'],
  exercises: [{ exercise_id: 'ex-1', sets: 4, reps: 8 }],
};

describe('routines.service', () => {
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
  });

  describe('addExercises', () => {
    it('agrega ejercicios a una rutina propia', async () => {
      mockRepo.findRoutineById.mockResolvedValue(ROUTINE);
      mockRepo.addRoutineExercises.mockResolvedValue([{ id: 're-2' }]);
      const result = await service.addExercises(TRAINER_ID, 'rt-1', [{ exercise_id: 'ex-2', sets: 3, reps: 10 }]);
      expect(result).toHaveLength(1);
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

  describe('update', () => {
    it('actualiza una rutina propia (ej. desactivarla)', async () => {
      mockRepo.findRoutineById.mockResolvedValue(ROUTINE);
      mockRepo.updateRoutine.mockResolvedValue({ ...ROUTINE, active: false });
      const result = await service.update(TRAINER_ID, 'rt-1', { active: false });
      expect(result.active).toBe(false);
      expect(mockRepo.updateRoutine).toHaveBeenCalledWith('rt-1', { active: false });
    });

    it('lanza FORBIDDEN si la rutina es de otro trainer', async () => {
      mockRepo.findRoutineById.mockResolvedValue({ ...ROUTINE, trainer_id: 'otro' });
      await expect(service.update(TRAINER_ID, 'rt-1', { active: false })).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(mockRepo.updateRoutine).not.toHaveBeenCalled();
    });
  });

  describe('today', () => {
    it('devuelve la rutina del día mapeada con sus ejercicios ordenados', async () => {
      mockRepo.findActiveRoutineForStudentToday.mockResolvedValue({
        id: 'rt-1',
        name: 'Full body',
        goal: 'hypertrophy',
        days: ['monday'],
        routine_exercises: [
          { id: 're-2', order_index: 1, sets: 3, reps: 10, exercise: { id: 'ex-2', name: 'Remo' } },
          { id: 're-1', order_index: 0, sets: 4, reps: 8, exercise: { id: 'ex-1', name: 'Press' } },
        ],
      });

      const result = await service.today('st-1');
      expect(result.routine_id).toBe('rt-1');
      expect(result.exercises.map((e) => e.exercise.name)).toEqual(['Press', 'Remo']); // ordenados
      expect(result.exercises[0].last_session_kg).toBeNull();
    });

    it('devuelve null si el alumno no tiene rutina activa hoy', async () => {
      mockRepo.findActiveRoutineForStudentToday.mockResolvedValue(null);
      expect(await service.today('st-1')).toBeNull();
    });
  });
});
