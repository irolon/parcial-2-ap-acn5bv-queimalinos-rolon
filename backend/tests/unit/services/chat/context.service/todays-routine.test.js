import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  contextService,
  mockContextRepo,
  mockRoutinesRepo,
  STUDENT,
  STUDENT_ID,
  EX_BENCH,
  EX_ROW,
  BENCH,
  ALTERNATIVES,
  NOW,
  routine,
} from '../../../../helpers/chat/chat-service.setup.js';

const { buildChatContext } = contextService;

describe('chat · context.service · buildChatContext · rutina del alumno', () => {
  beforeEach(() => {
    mockContextRepo.findAlternatives.mockResolvedValue(ALTERNATIVES);
  });

  const { findActiveRoutineForStudentToday: findToday, findActiveRoutinesForStudent: findActive } = mockRoutinesRepo;

  it('busca la rutina de hoy con el día de Argentina', async () => {
    await buildChatContext(STUDENT, BENCH, NOW);
    expect(findToday).toHaveBeenCalledWith(STUDENT_ID, 'saturday');
  });

  it('solo lee las demás rutinas si la de hoy no tiene el ejercicio', async () => {
    findToday.mockResolvedValue(routine());
    await buildChatContext(STUDENT, BENCH, NOW);
    expect(findActive).not.toHaveBeenCalled();
    findToday.mockResolvedValue(routine({ routine_exercises: [] }));
    findActive.mockResolvedValue([routine()]);
    await buildChatContext(STUDENT, BENCH, NOW);
    expect(findActive).toHaveBeenCalledWith(STUDENT_ID);
  });

  it('si la de hoy no tiene el ejercicio y otra activa sí, todays_routine es la de esa otra rutina', async () => {
    findToday.mockResolvedValue(routine({ routine_exercises: [] }));
    findActive.mockResolvedValue([routine()]);
    const context = await buildChatContext(STUDENT, BENCH, NOW);
    expect(context.todays_routine.map((e) => [e.exercise_name, e.is_current])).toEqual([
      ['Remo con barra', false],
      ['Press banca plano', true],
    ]);
  });

  it('las alternativas excluyen el ejercicio actual y los de la rutina', async () => {
    findToday.mockResolvedValue(routine());
    const context = await buildChatContext(STUDENT, BENCH, NOW);
    const { excludeIds } = mockContextRepo.findAlternatives.mock.calls[0][1];
    expect(excludeIds).toHaveLength(2);
    expect(new Set(excludeIds)).toEqual(new Set([EX_BENCH, EX_ROW]));
    expect(context.todays_routine).toEqual([
      { exercise_name: 'Remo con barra', muscle_group: 'back', sets: 3, reps: '10', suggested_kg: 20, is_current: false },
      { exercise_name: 'Press banca plano', muscle_group: 'chest', sets: 3, reps: '10', suggested_kg: 20, is_current: true },
    ]);
  });

  it('ejercicio inaccesible: rutina de hoy sin is_current y excluye solo la rutina', async () => {
    findToday.mockResolvedValue(routine());
    const context = await buildChatContext(STUDENT, null, NOW);
    expect(context.todays_routine).toHaveLength(2);
    expect(context.todays_routine.every((e) => e.is_current === false)).toBe(true);
    expect(findActive).not.toHaveBeenCalled();
    expect(new Set(mockContextRepo.findAlternatives.mock.calls[0][1].excludeIds)).toEqual(new Set([EX_BENCH, EX_ROW]));
  });

  it('sin rutinas: todays_routine null', async () => {
    const context = await buildChatContext(STUDENT, BENCH, NOW);
    expect(context.todays_routine).toBeNull();
  });

  it('el contexto no lleva el nombre de la rutina ni las notas', async () => {
    findToday.mockResolvedValue(routine());
    const sent = JSON.stringify(await buildChatContext(STUDENT, BENCH, NOW));
    expect(sent).not.toContain('Rutina de Lucía');
    expect(sent).not.toContain('nota del PT');
  });
});
