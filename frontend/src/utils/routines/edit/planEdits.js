import { sortDays } from '@/utils/students/routineDays';
import { exerciseValues } from '@/utils/routines/routineForm';

const num = (value) => (value === null || value === undefined || value === '' ? null : Number(value));
const text = (value) => (value === null || value === undefined || String(value).trim() === '' ? null : String(value).trim());

/** Valores del plan de una fila guardada, con la misma forma que `exerciseValues`. */
function savedValues(e) {
  return {
    sets: num(e.sets), reps: num(e.reps), rest_seconds: num(e.rest_seconds), suggested_kg: num(e.suggested_kg),
    tempo: text(e.tempo), notes: text(e.notes),
  };
}

const sameValues = (a, b) => Object.keys(a).every((field) => a[field] === b[field]);

/** Campos de la cabecera que cambiaron (para `PATCH /routines/:id`), o `null` si ninguno. */
function headerChanges(detail, state) {
  const next = { name: state.name.trim(), goal: state.goal || null, level: state.level || null, days: sortDays(state.days) };
  const saved = { name: detail.name, goal: detail.goal ?? null, level: detail.level ?? null, days: sortDays(detail.days ?? []) };
  const changed = Object.keys(next).filter((field) => JSON.stringify(next[field]) !== JSON.stringify(saved[field]));
  return changed.length ? Object.fromEntries(changed.map((field) => [field, next[field]])) : null;
}

/**
 * Qué hay que mandar para que la rutina guardada (`detail`, de `GET /routines/:id`) quede como el editor (`state`):
 * - `header`: campos de la cabecera que cambiaron (o `null`);
 * - `adds`: filas nuevas, o reemplazadas (otro ejercicio en una fila guardada), con `{ key, body }` en el orden de la
 *   pantalla (`body.order` 0..n-1: el servidor las pone al final, en ese orden);
 * - `updates`: `{ id, body }` de las filas guardadas con valores distintos;
 * - `removes`: ids de las filas guardadas que ya no están (o se reemplazaron);
 * - `reorder`: si después de altas y bajas el orden no queda como en la pantalla.
 */
export function planEdits(detail, state) {
  const saved = new Map((detail.exercises ?? []).map((e) => [e.routine_exercise_id, e]));
  const savedOrder = [...(detail.exercises ?? [])].sort((a, b) => a.order_index - b.order_index).map((e) => e.routine_exercise_id);
  const kept = new Set();
  const adds = [];
  const updates = [];
  const sequence = [];
  for (const row of state.exercises) {
    const base = row.routineExerciseId ? saved.get(row.routineExerciseId) : null;
    const values = exerciseValues(row);
    if (base && (base.exercise?.id ?? base.exercise_id) === row.exercise_id) {
      kept.add(base.routine_exercise_id);
      sequence.push(base.routine_exercise_id);
      if (!sameValues(values, savedValues(base))) updates.push({ id: base.routine_exercise_id, body: values });
    } else {
      sequence.push(`new:${row.key}`);
      adds.push({ key: row.key, body: { exercise_id: row.exercise_id, ...values, order: adds.length } });
    }
  }
  const removes = savedOrder.filter((id) => !kept.has(id));
  const expected = [...savedOrder.filter((id) => kept.has(id)), ...adds.map((a) => `new:${a.key}`)];
  const reorder = sequence.some((id, index) => id !== expected[index]);
  const header = headerChanges(detail, state);
  const empty = !header && !adds.length && !updates.length && !removes.length && !reorder;
  return { header, adds, updates, removes, reorder, empty };
}
