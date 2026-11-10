import { describe, it, expect } from '@jest/globals';
import {
  extraContextService,
  mockContextRepo,
  mockRoutinesRepo,
  mockHistoryService,
  TRAINER_ID,
  STUDENT_ID,
  NOW,
  SUMMARY,
} from '../../../helpers/trainer-ai/extra-context.setup.js';

const { buildExtraContext } = extraContextService;

const re = (order_index, name) => ({ order_index, exercise: { name } });
const MY_ROUTINE = {
  name: 'Rutina de Lucía',
  goal: 'strength',
  days: ['monday', 'thursday'],
  routine_exercises: [
    { order_index: 2, sets: 3, reps: 10, suggested_kg: null, notes: 'Evitar peso muerto por la lumbar', exercise: { id: 'e2', name: 'Remo', muscle_group: 'back' } },
    { order_index: 1, sets: 4, reps: 8, suggested_kg: 60, notes: null, exercise: { id: 'e1', name: 'Press banca', muscle_group: 'chest' } },
  ],
};

describe('trainer-ai · extra-context.service · buildExtraContext', () => {
  it('sin alumno manda solo las rutinas del profe', async () => {
    const data = await buildExtraContext(TRAINER_ID, { goal: 'strength', studentId: null }, NOW);
    expect(data).toEqual({ previous_routines: [], student_history: null, current_routine: null });
    expect(mockHistoryService.buildStudentHistory).not.toHaveBeenCalled();
    expect(mockRoutinesRepo.findActiveRoutinesForStudent).not.toHaveBeenCalled();
    expect(mockContextRepo.findRecentRoutines).toHaveBeenCalledWith(TRAINER_ID, { goal: 'strength', excludeStudentId: null });
  });

  it('previous_routines lleva goal, days y los nombres en el orden de la rutina', async () => {
    mockContextRepo.findRecentRoutines.mockResolvedValue([
      { goal: 'strength', days: ['friday'], routine_exercises: [re(2, 'Remo'), re(1, 'Sentadilla')] },
    ]);
    const data = await buildExtraContext(TRAINER_ID, { goal: 'strength', studentId: null }, NOW);
    expect(data.previous_routines).toEqual([{ goal: 'strength', days: ['friday'], exercise_names: ['Sentadilla', 'Remo'] }]);
  });

  it('con alumno suma historial y rutina actual, sin nombres ni notas', async () => {
    mockRoutinesRepo.findActiveRoutinesForStudent.mockResolvedValue([MY_ROUTINE]);
    const data = await buildExtraContext(TRAINER_ID, { goal: 'strength', studentId: STUDENT_ID }, NOW);
    expect(data.student_history).toEqual(SUMMARY);
    expect(mockHistoryService.buildStudentHistory).toHaveBeenCalledWith(STUDENT_ID, NOW);
    expect(data.current_routine[0]).toEqual({
      goal: 'strength',
      days: ['monday', 'thursday'],
      exercises: [
        { exercise_name: 'Press banca', muscle_group: 'chest', sets: 4, reps: 8, suggested_kg: 60 },
        { exercise_name: 'Remo', muscle_group: 'back', sets: 3, reps: 10, suggested_kg: null },
      ],
    });
    const sent = JSON.stringify(data.current_routine);
    expect(sent).not.toContain('Rutina de Lucía');
    expect(sent).not.toContain('Evitar peso muerto');
    expect(mockContextRepo.findRecentRoutines).toHaveBeenCalledWith(TRAINER_ID, { goal: 'strength', excludeStudentId: STUDENT_ID });
  });

  it('alumno sin rutinas activas → current_routine []', async () => {
    const data = await buildExtraContext(TRAINER_ID, { goal: 'strength', studentId: STUDENT_ID }, NOW);
    expect(data.current_routine).toEqual([]);
  });
});
