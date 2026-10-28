import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockRepo, mockRoutinesRepo, service, STUDENT_ID, TRAINER_ID, SESSION_ID, SESSION,
  EX_A, EX_B, RE_1, arrange, rawSet, setId,
} from '../../../../helpers/sessions/session-sets-service.setup.js';

beforeEach(() => { jest.resetAllMocks(); arrange(); });

describe('session-sets.service · addSets (conflictos y ejercicios)', () => {
  it('id en otra sesión: failed SET_ID_CONFLICT y no entra al upsert', async () => {
    arrange({ existing: [{ id: setId(1), session_id: 'otra-sesion' }] });
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1), rawSet(2)] });
    expect(res.failed).toEqual([expect.objectContaining({ id: setId(1), index: 0, code: 'SET_ID_CONFLICT' })]);
    expect(mockRepo.upsertSets.mock.calls[0][0].map((r) => r.id)).toEqual([setId(2)]);
  });

  it('ejercicio inaccesible: EXERCISE_NOT_FOUND', async () => {
    arrange({ accessible: [EX_B] });
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1)] });
    expect(res.failed[0]).toMatchObject({ id: setId(1), code: 'EXERCISE_NOT_FOUND' });
    expect(mockRepo.upsertSets).not.toHaveBeenCalled();
  });

  it('original_exercise_id inaccesible: EXERCISE_NOT_FOUND', async () => {
    arrange({ accessible: [EX_A] });
    const res = await service.addSets(STUDENT_ID, SESSION_ID, {
      sets: [rawSet(1, { exercise_id: EX_A, original_exercise_id: EX_B })],
    });
    expect(res.failed[0]).toMatchObject({ code: 'EXERCISE_NOT_FOUND' });
  });

  it('una sola consulta de ejercicios, con el trainer del alumno', async () => {
    await service.addSets(STUDENT_ID, SESSION_ID, {
      sets: [rawSet(1), rawSet(2, { exercise_id: EX_B, original_exercise_id: EX_A })],
    });
    expect(mockRoutinesRepo.findAccessibleExerciseIds).toHaveBeenCalledTimes(1);
    const [ids, trainer] = mockRoutinesRepo.findAccessibleExerciseIds.mock.calls[0];
    expect([...ids].sort()).toEqual([EX_A, EX_B].sort());
    expect(trainer).toBe(TRAINER_ID);
  });
});

describe('session-sets.service · addSets (routine_exercise_id)', () => {
  it('de la rutina de la sesión: se conserva', async () => {
    await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1, { routine_exercise_id: RE_1 })] });
    expect(mockRepo.findRoutineExerciseIds).toHaveBeenCalledWith(SESSION.routine_id, [RE_1]);
    expect(mockRepo.upsertSets.mock.calls[0][0][0].routine_exercise_id).toBe(RE_1);
  });

  it('ajeno: la serie se guarda con routine_exercise_id null', async () => {
    arrange({ routineExercises: [] });
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1, { routine_exercise_id: RE_1 })] });
    expect(res.saved).toHaveLength(1);
    expect(res.failed).toEqual([]);
    expect(mockRepo.upsertSets.mock.calls[0][0][0].routine_exercise_id).toBeNull();
  });

  it('sesión sin rutina: se guarda con null y no se consulta', async () => {
    arrange({ session: { ...SESSION, routine_id: null } });
    await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1, { routine_exercise_id: RE_1 })] });
    expect(mockRepo.findRoutineExerciseIds).not.toHaveBeenCalled();
    expect(mockRepo.upsertSets.mock.calls[0][0][0].routine_exercise_id).toBeNull();
  });
});

describe('session-sets.service · addSets (sustituciones)', () => {
  it('con sustitución: markSessionModified', async () => {
    await service.addSets(STUDENT_ID, SESSION_ID, {
      sets: [rawSet(1), rawSet(2, { exercise_id: EX_B, original_exercise_id: EX_A })],
    });
    expect(mockRepo.markSessionModified).toHaveBeenCalledWith(SESSION_ID);
  });

  it('sin sustitución (original igual o null): no se marca', async () => {
    await service.addSets(STUDENT_ID, SESSION_ID, {
      sets: [rawSet(1), rawSet(2, { original_exercise_id: EX_A })],
    });
    expect(mockRepo.markSessionModified).not.toHaveBeenCalled();
  });

  it('todas fallidas: ni upsert ni mark', async () => {
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [{ id: 'x' }] });
    expect(res.saved).toEqual([]);
    expect(mockRepo.upsertSets).not.toHaveBeenCalled();
    expect(mockRepo.markSessionModified).not.toHaveBeenCalled();
  });

  it('la sustitución fallida (ejercicio inaccesible) no marca la sesión', async () => {
    arrange({ accessible: [EX_A] });
    await service.addSets(STUDENT_ID, SESSION_ID, {
      sets: [rawSet(1, { exercise_id: EX_B, original_exercise_id: EX_A })],
    });
    expect(mockRepo.markSessionModified).not.toHaveBeenCalled();
  });
});
