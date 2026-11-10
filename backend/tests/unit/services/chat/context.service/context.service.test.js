import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  contextService,
  mockSessionsRepo,
  mockExercisesRepo,
  mockContextRepo,
  STUDENT,
  STUDENT_ID,
  OTHER_STUDENT,
  OTHER_TRAINER,
  TRAINER_ID,
  SESSION_ID,
  EX_BENCH,
  NOW,
  BENCH,
  ALTERNATIVES,
  session,
} from '../../../../helpers/chat/chat-service.setup.js';

const { resolveSessionId, findCurrentExercise, buildChatContext } = contextService;

describe('chat · context.service · resolveSessionId', () => {
  it('sin session_id no consulta la base', async () => {
    await expect(resolveSessionId(STUDENT_ID, undefined)).resolves.toBeNull();
    expect(mockSessionsRepo.findSessionById).not.toHaveBeenCalled();
  });

  it('sesión propia y en curso → su id', async () => {
    mockSessionsRepo.findSessionById.mockResolvedValue(session());
    await expect(resolveSessionId(STUDENT_ID, SESSION_ID)).resolves.toBe(SESSION_ID);
    expect(mockSessionsRepo.findSessionById).toHaveBeenCalledWith(SESSION_ID);
  });

  it('sesión que todavía no está en el servidor (offline-first) → se acepta sin sesión', async () => {
    mockSessionsRepo.findSessionById.mockResolvedValue(null);
    await expect(resolveSessionId(STUDENT_ID, SESSION_ID)).resolves.toBeNull();
  });

  it('sesión de otro alumno → 404 SESSION_NOT_FOUND', async () => {
    mockSessionsRepo.findSessionById.mockResolvedValue(session({ student_id: OTHER_STUDENT }));
    await expect(resolveSessionId(STUDENT_ID, SESSION_ID)).rejects.toMatchObject({
      statusCode: 404,
      code: 'SESSION_NOT_FOUND',
    });
  });

  it('sesión terminada → 400 SESSION_FINISHED', async () => {
    mockSessionsRepo.findSessionById.mockResolvedValue(session({ finished_at: '2026-11-07T14:00:00Z' }));
    await expect(resolveSessionId(STUDENT_ID, SESSION_ID)).rejects.toMatchObject({
      statusCode: 400,
      code: 'SESSION_FINISHED',
    });
  });
});

describe('chat · context.service · findCurrentExercise', () => {
  it('sin current_exercise_id → null sin consultar', async () => {
    await expect(findCurrentExercise(STUDENT, undefined)).resolves.toBeNull();
    expect(mockExercisesRepo.findExerciseById).not.toHaveBeenCalled();
  });

  it('global → el ejercicio', async () => {
    mockExercisesRepo.findExerciseById.mockResolvedValue(BENCH);
    await expect(findCurrentExercise(STUDENT, EX_BENCH)).resolves.toBe(BENCH);
  });

  it('del PT del alumno → el ejercicio', async () => {
    const own = { ...BENCH, is_global: false, trainer_id: TRAINER_ID };
    mockExercisesRepo.findExerciseById.mockResolvedValue(own);
    await expect(findCurrentExercise(STUDENT, EX_BENCH)).resolves.toBe(own);
  });

  it.each([
    ['inexistente', null],
    ['de otro PT', { ...BENCH, is_global: false, trainer_id: OTHER_TRAINER }],
  ])('%s → se ignora (null), sin error', async (_label, found) => {
    mockExercisesRepo.findExerciseById.mockResolvedValue(found);
    await expect(findCurrentExercise(STUDENT, EX_BENCH)).resolves.toBeNull();
  });

  it('alumno sin PT: un ejercicio no global se ignora', async () => {
    mockExercisesRepo.findExerciseById.mockResolvedValue({ ...BENCH, is_global: false, trainer_id: null });
    await expect(findCurrentExercise({ ...STUDENT, trainer_id: null }, EX_BENCH)).resolves.toBeNull();
  });
});

describe('chat · context.service · buildChatContext', () => {
  beforeEach(() => {
    mockContextRepo.findAlternatives.mockResolvedValue(ALTERNATIVES);
  });

  it('ejercicio y alumno sin datos personales; alternativas del grupo con su equipamiento + bodyweight', async () => {
    const context = await buildChatContext(STUDENT, BENCH, NOW);
    expect(context).toEqual({
      exercise: { name: 'Press banca plano', muscle_group: 'chest', equipment: 'barbell' },
      student: {
        goal: 'hypertrophy',
        level: 'intermediate',
        gym_equipment: ['dumbbell', 'machine'],
        injuries: 'Hombro derecho',
      },
      alternatives: ALTERNATIVES,
      todays_routine: null,
    });
    expect(mockContextRepo.findAlternatives).toHaveBeenCalledWith(TRAINER_ID, {
      equipment: ['dumbbell', 'machine', 'bodyweight'],
      muscleGroup: 'chest',
      excludeIds: [EX_BENCH],
    });
    const sent = JSON.stringify(context);
    for (const pii of [STUDENT.name, STUDENT.email, STUDENT.birth_date, STUDENT.avatar_url, STUDENT_ID]) {
      expect(sent).not.toContain(pii);
    }
  });

  it('sin ejercicio actual: exercise null y alternativas de todos los grupos', async () => {
    const context = await buildChatContext(STUDENT, null, NOW);
    expect(context.exercise).toBeNull();
    expect(mockContextRepo.findAlternatives).toHaveBeenCalledWith(TRAINER_ID, {
      equipment: ['dumbbell', 'machine', 'bodyweight'],
      muscleGroup: null,
      excludeIds: [],
    });
  });

  it('equipamiento inválido o repetido → solo lo válido, sin repetir; lesiones en blanco → null', async () => {
    const student = { ...STUDENT, gym_equipment: ['dumbbell', 'laser', 'dumbbell', 'bodyweight'], injuries: '   ' };
    const context = await buildChatContext(student, null, NOW);
    expect(context.student.gym_equipment).toEqual(['dumbbell', 'bodyweight']);
    expect(context.student.injuries).toBeNull();
    expect(mockContextRepo.findAlternatives.mock.calls[0][1].equipment).toEqual(['dumbbell', 'bodyweight']);
  });

  it('texto libre de la ficha ("barra", "Mancuernas") → códigos del catálogo para el alumno y las alternativas', async () => {
    const context = await buildChatContext({ ...STUDENT, gym_equipment: ['barra', 'Mancuernas', 'Banco plano'] }, null, NOW);
    expect(context.student.gym_equipment).toEqual(['barbell', 'dumbbell']);
    expect(mockContextRepo.findAlternatives.mock.calls[0][1].equipment).toEqual(['barbell', 'dumbbell', 'bodyweight']);
  });

  it('sin equipamiento cargado (null): solo bodyweight para las alternativas', async () => {
    const context = await buildChatContext({ ...STUDENT, gym_equipment: null }, null, NOW);
    expect(context.student.gym_equipment).toEqual([]);
    expect(mockContextRepo.findAlternatives.mock.calls[0][1].equipment).toEqual(['bodyweight']);
  });

  it('alumno sin goal, level ni PT: null y solo ejercicios globales', async () => {
    const context = await buildChatContext({ ...STUDENT, goal: null, level: null, trainer_id: null }, null, NOW);
    expect(context.student).toMatchObject({ goal: null, level: null });
    expect(mockContextRepo.findAlternatives.mock.calls[0][0]).toBeNull();
  });
});
