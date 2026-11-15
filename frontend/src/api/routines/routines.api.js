import { request } from '@/api/shared/client';

/** GET /routines → rutinas del entrenador. */
export async function listRoutines() {
  const res = await request('/routines');
  return res.data;
}

/** POST /routines → rutina creada (201). */
export async function createRoutine(body) {
  const res = await request('/routines', { method: 'POST', body });
  return res.data;
}

/** GET /routines/:id → rutina propia con sus ejercicios en orden (para editarla). */
export async function getRoutine(id) {
  const res = await request(`/routines/${id}`);
  return res.data;
}

/** PATCH /routines/:id → cabecera (nombre, objetivo, nivel, días). */
export async function updateRoutine(id, body) {
  const res = await request(`/routines/${id}`, { method: 'PATCH', body });
  return res.data;
}

/** POST /routines/:id/exercises → filas creadas (van al final, en el orden recibido). */
export async function addRoutineExercises(id, exercises) {
  const res = await request(`/routines/${id}/exercises`, { method: 'POST', body: { exercises } });
  return res.data;
}

/** PATCH /routines/:id/exercises/:routineExerciseId → valores del plan de una fila. */
export async function updateRoutineExercise(id, routineExerciseId, body) {
  const res = await request(`/routines/${id}/exercises/${routineExerciseId}`, { method: 'PATCH', body });
  return res.data;
}

/** DELETE /routines/:id/exercises/:routineExerciseId (204). */
export async function removeRoutineExercise(id, routineExerciseId) {
  await request(`/routines/${id}/exercises/${routineExerciseId}`, { method: 'DELETE' });
}

/** PUT /routines/:id/exercises/order → orden final (exactamente las filas de la rutina). */
export async function reorderRoutineExercises(id, routineExerciseIds) {
  const res = await request(`/routines/${id}/exercises/order`, { method: 'PUT', body: { routine_exercise_ids: routineExerciseIds } });
  return res.data;
}

// Rutina del alumno con la forma de /today: siempre `routine_id`, `days` y `exercises`, y cada ejercicio con
// `last_session_kg`. /mine no lo calcula (solo /today) y trae `created_at`, que /today no: ahí queda en null.
function toStudentRoutine(routine) {
  return {
    routine_id: routine.routine_id ?? routine.id,
    name: routine.name,
    goal: routine.goal ?? null,
    level: routine.level ?? null,
    days: routine.days ?? [],
    created_at: routine.created_at ?? null,
    exercises: (routine.exercises ?? []).map((exercise) => ({
      ...exercise,
      last_session_kg: exercise.last_session_kg ?? null,
    })),
  };
}

/** GET /routines/today → la rutina del día del alumno, o `null` si hoy no tiene. */
export async function getTodayRoutine() {
  const res = await request('/routines/today');
  return res.data ? toStudentRoutine(res.data) : null;
}

/** GET /routines/mine → rutinas activas del alumno (la más nueva primero), con la forma de /today. */
export async function getMyRoutines() {
  const res = await request('/routines/mine');
  return res.data.map(toStudentRoutine);
}
