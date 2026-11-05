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

// Rutina del alumno con la forma de /today: siempre `routine_id`, `days` y `exercises`, y cada ejercicio con
// `last_session_kg`. /mine no lo calcula (solo /today) y trae `created_at`, que /today no: ahí queda en null.
function toStudentRoutine(routine) {
  return {
    routine_id: routine.routine_id ?? routine.id,
    name: routine.name,
    goal: routine.goal ?? null,
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
