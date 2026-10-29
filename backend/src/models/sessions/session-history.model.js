/**
 * Modelo del historial de sesiones: helpers puros que arman el resumen de una
 * sesión y el detalle agrupado por ejercicio. SIN acceso a datos.
 * Los numéricos de Supabase pueden llegar como string: se coercionan.
 */

const toNum = (v) => (v === null || v === undefined ? null : Number(v));
const round1 = (n) => Math.round(n * 10) / 10;
const lookup = (src, key) => (src instanceof Map ? src.get(key) : src?.[key]);

/** Minutos enteros entre inicio y fin; null si la sesión no se cerró. */
export function durationMin(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) return null;
  return Math.round((new Date(finishedAt) - new Date(startedAt)) / 60000);
}

/** Series que cuentan (completadas, reps > 0) y volumen en kg a 1 decimal. */
export function summarizeSets(sets) {
  let count = 0;
  let volume = 0;
  for (const s of sets) {
    const reps = toNum(s.actual_reps);
    if (!s.completed || !(reps > 0)) continue;
    count += 1;
    volume += reps * (toNum(s.actual_kg) ?? 0);
  }
  return { sets: count, volume_kg: round1(volume) };
}

/** Resumen de §2.1. recordsBySession: Set de ids de sesión con récord. */
export function toSessionSummary(row, { sets, recordsBySession }) {
  const { sets: count, volume_kg } = summarizeSets(sets);
  return {
    id: row.id,
    started_at: row.started_at,
    finished_at: row.finished_at ?? null,
    duration_min: durationMin(row.started_at, row.finished_at),
    routine: row.routine ? { id: row.routine.id, name: row.routine.name } : null,
    rpe: row.rpe ?? null,
    notes: row.notes ?? null,
    trainer_comment: row.trainer_comment ?? null,
    has_modifications: row.has_modifications,
    sets: count,
    volume_kg,
    has_pr: recordsBySession.has(row.id),
  };
}

const refOf = (id, exercisesById) => ({ id, name: lookup(exercisesById, id)?.name ?? null });

const toPlanned = (p) =>
  p ? { sets: toNum(p.sets), reps: toNum(p.reps), suggested_kg: toNum(p.suggested_kg) } : null;

const toSetOut = (s) => ({
  id: s.id,
  set_number: toNum(s.set_number),
  actual_reps: toNum(s.actual_reps),
  actual_kg: toNum(s.actual_kg),
  completed: s.completed,
  executed_at: s.executed_at,
});

/** Detalle de §2.2: series agrupadas por ejercicio hecho (y original), por primer executed_at. */
export function groupSetsByExercise(
  sets,
  { exercisesById, plannedByRoutineExercise, recordExerciseIds },
) {
  const ordered = [...sets].sort((a, b) => new Date(a.executed_at) - new Date(b.executed_at));
  const groups = new Map();
  for (const s of ordered) {
    const original = s.original_exercise_id ?? null;
    const key = `${s.exercise_id}|${original ?? ''}`;
    if (!groups.has(key)) {
      const planned = s.routine_exercise_id
        ? lookup(plannedByRoutineExercise, s.routine_exercise_id)
        : null;
      groups.set(key, {
        exercise: refOf(s.exercise_id, exercisesById),
        original_exercise: original ? refOf(original, exercisesById) : null,
        planned: toPlanned(planned),
        is_pr: recordExerciseIds.has(s.exercise_id),
        sets: [],
      });
    }
    groups.get(key).sets.push(toSetOut(s));
  }
  return [...groups.values()];
}
