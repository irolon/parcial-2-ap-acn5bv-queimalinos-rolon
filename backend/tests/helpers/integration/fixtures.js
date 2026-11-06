import { randomUUID } from 'node:crypto';
import { DAYS } from '../../../src/models/routines/routine.model.js';
import { api, expectStatus } from './api.js';
import { qaName } from './run-id.js';

export const ALL_DAYS = [...DAYS];

/** Ejercicio propio del PT → id. */
export async function createExercise(trainer, label, muscle_group = 'chest') {
  const res = await api(trainer.token)
    .post('/exercises')
    .send({ name: qaName(label), muscle_group });
  expectStatus(res, 201, 'POST /exercises');
  return res.body.data.id;
}

/** Rutina asignada al alumno con esos ejercicios (3×10 cada uno). */
export async function createRoutine(trainer, studentId, { label, exerciseIds, days = ALL_DAYS }) {
  const res = await api(trainer.token)
    .post('/routines')
    .send({
      student_id: studentId,
      name: qaName(label),
      goal: 'hypertrophy',
      days,
      exercises: exerciseIds.map((exercise_id) => ({ exercise_id, sets: 3, reps: 10 })),
    });
  expectStatus(res, 201, 'POST /routines');
  return { id: res.body.data.id, routineExerciseIds: res.body.data.exercises.map((e) => e.id) };
}

/** Una serie para POST /sessions/:id/sets (`originalExerciseId`: el planificado si se sustituyó). */
export function setRow({
  exerciseId,
  originalExerciseId = null,
  setNumber,
  reps,
  kg,
  executedAt,
  completed = true,
  id = randomUUID(),
}) {
  return {
    id,
    exercise_id: exerciseId,
    original_exercise_id: originalExerciseId,
    set_number: setNumber,
    actual_reps: reps,
    actual_kg: kg,
    completed,
    executed_at: executedAt,
  };
}

/** Sube una sesión del alumno (y sus series si hay) → { sessionId, saved, failed }. */
export async function uploadSession(
  student,
  { id = randomUUID(), startedAt, finishedAt = null, routineId = null, sets = [] }
) {
  const session = await api(student.token)
    .post('/sessions')
    .send({ id, started_at: startedAt, finished_at: finishedAt, routine_id: routineId });
  expectStatus(session, 201, 'POST /sessions');
  if (sets.length === 0) return { sessionId: id, saved: [], failed: [] };

  const res = await api(student.token).post(`/sessions/${id}/sets`).send({ sets });
  expectStatus(res, 200, 'POST /sessions/:id/sets');
  return { sessionId: id, saved: res.body.data.saved, failed: res.body.data.failed };
}
