import {
  mockRepo,
  mockProgressRepo,
  service,
  TRAINER_ID,
  ROUTINE,
} from '../../../../helpers/routines/routines-service.setup.js';

describe('routines.service', () => {
  // Por defecto todos los ejercicios pedidos son accesibles (globales o propios).
  beforeEach(() => {
    mockRepo.findAccessibleExerciseIds.mockImplementation(async (ids) => ids);
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
    const row = {
      id: 'rt-1',
      name: 'Full body',
      goal: 'hypertrophy',
      days: ['monday'],
      routine_exercises: [
        { id: 're-2', order_index: 1, sets: 3, reps: 10, exercise_id: 'ex-2', exercise: { id: 'ex-2', name: 'Remo' } },
        { id: 're-1', order_index: 0, sets: 4, reps: 8, exercise_id: 'ex-1', exercise: { id: 'ex-1', name: 'Press' } },
      ],
    };

    beforeEach(() => {
      mockProgressRepo.fetchLastSessionKg.mockResolvedValue({});
    });

    it('devuelve la rutina del día mapeada con sus ejercicios ordenados', async () => {
      mockRepo.findActiveRoutineForStudentToday.mockResolvedValue(row);
      const result = await service.today('st-1');
      expect(result.routine_id).toBe('rt-1');
      expect(result.exercises.map((e) => e.exercise.name)).toEqual(['Press', 'Remo']); // ordenados
    });

    it('consulta last_session_kg una sola vez con los ejercicios de la rutina', async () => {
      mockRepo.findActiveRoutineForStudentToday.mockResolvedValue(row);
      await service.today('st-1');
      expect(mockProgressRepo.fetchLastSessionKg).toHaveBeenCalledTimes(1);
      const [studentId, ids] = mockProgressRepo.fetchLastSessionKg.mock.calls[0];
      expect(studentId).toBe('st-1');
      expect([...ids].sort()).toEqual(['ex-1', 'ex-2']);
    });

    it('trae el kg redondeado del ejercicio hecho y null del que nunca hizo', async () => {
      mockRepo.findActiveRoutineForStudentToday.mockResolvedValue(row);
      mockProgressRepo.fetchLastSessionKg.mockResolvedValue({ 'ex-1': '62.46' });
      const result = await service.today('st-1');
      expect(result.exercises[0].last_session_kg).toBe(62.5); // Press
      expect(result.exercises[1].last_session_kg).toBeNull(); // Remo
    });

    it('no llama al RPC si la rutina no tiene ejercicios', async () => {
      mockRepo.findActiveRoutineForStudentToday.mockResolvedValue({ ...row, routine_exercises: [] });
      const result = await service.today('st-1');
      expect(result.exercises).toEqual([]);
      expect(mockProgressRepo.fetchLastSessionKg).not.toHaveBeenCalled();
    });

    it('devuelve null si el alumno no tiene rutina activa hoy', async () => {
      mockRepo.findActiveRoutineForStudentToday.mockResolvedValue(null);
      expect(await service.today('st-1')).toBeNull();
      expect(mockProgressRepo.fetchLastSessionKg).not.toHaveBeenCalled();
    });
  });
});
