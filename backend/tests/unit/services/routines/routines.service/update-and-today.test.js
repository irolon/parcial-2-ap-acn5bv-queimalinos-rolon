import {
  mockRepo,
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
