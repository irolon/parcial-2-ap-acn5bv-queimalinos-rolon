import { afterEach, describe, expect, it, vi } from 'vitest';
import { newUuid, startWorkout } from '@/utils/workout/workoutState';
import { mineRoutine, routineExercise, todayRoutine } from '../../../helpers/routines/studentRoutines';
import { T0 } from '../../../helpers/workout/workout';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const start = (routine) => startWorkout(routine, { now: T0, newId: () => 'session-1' });

afterEach(() => vi.unstubAllGlobals());

describe('startWorkout', () => {
  it('copia la rutina con la forma de la spec y arranca en el primer ejercicio, sin series ni descanso', () => {
    expect(start(todayRoutine())).toStrictEqual({
      id: 'session-1',
      routineId: 'r-1',
      routineName: 'Push · día 3',
      startedAt: '2026-11-01T13:00:00.000Z',
      finishedAt: null,
      exercises: [
        {
          routineExerciseId: 're-1', exerciseId: 'e-1', name: 'Press banca',
          sets: 4, reps: 10, restSeconds: 90, suggestedKg: 60, lastKg: 62.5,
        },
        {
          routineExerciseId: 're-2', exerciseId: 'e-2', name: 'Remo con barra',
          sets: 3, reps: 12, restSeconds: 60, suggestedKg: null, lastKg: null,
        },
      ],
      sets: [],
      cursor: 0,
      restEndsAt: null,
      feedback: null,
      upload: { sessionCreated: false, sentSetIds: [], failed: [], unlocked: [] },
    });
  });

  it('lo que la rutina no trae se completa como el plan de Hoy: 3 series, 10 reps y 90 s de descanso', () => {
    const routine = todayRoutine({
      exercises: [routineExercise({ sets: null, reps: null, rest_seconds: null, suggested_kg: null })],
    });
    expect(start(routine).exercises[0]).toMatchObject({ sets: 3, reps: 10, restSeconds: 90, suggestedKg: null });
  });

  it('respeta un descanso de 0 s y recorta las series del plan a 1-100 (el máximo de set_number)', () => {
    const routine = todayRoutine({
      exercises: [routineExercise({ rest_seconds: 0, sets: 250 }), routineExercise({ routine_exercise_id: 're-2', sets: 0 })],
    });
    const [first, second] = start(routine).exercises;
    expect(first).toMatchObject({ restSeconds: 0, sets: 100 });
    expect(second.sets).toBe(1);
  });

  it('un peso en 0 es "sin peso": queda en null en la copia, campo por campo', () => {
    const routine = todayRoutine({
      exercises: [routineExercise({ suggested_kg: 20, last_session_kg: 0 }), routineExercise({ routine_exercise_id: 're-2', suggested_kg: 0 })],
    });
    const [first, second] = start(routine).exercises;
    expect(first).toMatchObject({ suggestedKg: 20, lastKg: null });
    expect(second).toMatchObject({ suggestedKg: null, lastKg: null });
  });

  it('una rutina de /mine (sin last_session_kg) queda con lastKg en null', () => {
    expect(start(mineRoutine()).exercises.map((exercise) => exercise.lastKg)).toEqual([null, null]);
  });

  it('saltea los ejercicios sin id (no se podrían subir) y sin ninguno no hay sesión', () => {
    const routine = todayRoutine({
      exercises: [routineExercise({ exercise: null }), routineExercise({ routine_exercise_id: 're-2' })],
    });
    expect(start(routine).exercises.map((exercise) => exercise.routineExerciseId)).toEqual(['re-2']);
    expect(start(todayRoutine({ exercises: [] }))).toBeNull();
    expect(start(null)).toBeNull();
  });

  it('sin `now` ni `newId` usa la hora actual y un UUID v4', () => {
    const state = startWorkout(todayRoutine());
    expect(state.id).toMatch(UUID_V4);
    expect(Date.parse(state.startedAt)).not.toBeNaN();
  });
});

describe('newUuid', () => {
  it('usa crypto.randomUUID cuando existe', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'from-randomUUID' });
    expect(newUuid()).toBe('from-randomUUID');
  });

  it('sin crypto.randomUUID (http o navegador viejo) arma un UUID v4 con getRandomValues', () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: (bytes) => real.getRandomValues(bytes) });
    const ids = new Set(Array.from({ length: 50 }, () => newUuid()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });
});
