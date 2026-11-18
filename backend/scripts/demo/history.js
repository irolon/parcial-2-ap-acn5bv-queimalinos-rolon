import { addDays, atLocal, daysBetween, weekdayName } from './dates.js';

// Historial de entrenamientos de la demo: puro (sin base), determinístico por semilla.

/** Pseudoaleatorio con semilla (mulberry32): mismos números en cada corrida. */
export function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const roundTo = (value, step) => Math.round(value / step) * step;
const NOTES = ['Me sentí bien', 'Costó el final', 'Buen día', 'Poco tiempo, fui rápido', null, null, null];

function buildSets(exercises, startMs, week, rng) {
  const sets = [];
  let clock = startMs + 5 * 60000; // 5 minutos de entrada en calor
  for (const ex of exercises) {
    const kg = ex.baseKg > 0 ? roundTo(ex.baseKg + ex.stepKg * week, 2.5) : null;
    for (let n = 1; n <= ex.sets; n += 1) {
      clock += 45000 + Math.round(rng() * 30000); // la serie
      const tired = n === ex.sets && rng() < 0.4;
      sets.push({
        exercise: ex.name,
        original: ex.substitutedFrom ?? null,
        setNumber: n,
        reps: tired ? ex.reps - 1 : ex.reps,
        kg,
        executedAt: new Date(clock).toISOString(),
        rest: ex.rest,
      });
      clock += ex.rest * 1000;
    }
  }
  return { sets, endMs: clock + 3 * 60000 };
}

/**
 * Sesiones de `from` a `until` (sin incluir) en los días de cada rutina.
 * `skipRate`: probabilidad de faltar a un día asignado. `stopBefore`: última fecha posible (excluida).
 * `steadyDays`: en los últimos N días antes de `until` no falta (la racha llega viva a la demo).
 * `substitute(date, rng)` opcional: devuelve el ejercicio a reemplazar ese día (alumno que cambia ejercicios).
 */
export function buildSessions({
  routines, from, until, seed, skipRate = 0.15, steadyDays = 14, stopBefore, hour = 19, substitute,
}) {
  const rng = createRng(seed);
  const end = stopBefore && stopBefore < until ? stopBefore : until;
  const sessions = [];
  for (let date = from; date < end; date = addDays(date, 1)) {
    const routine = routines.find((r) => r.days.includes(weekdayName(date)));
    if (!routine) continue;
    const skip = rng() < skipRate;
    if (skip && daysBetween(date, until) > steadyDays) continue;
    const week = Math.floor(daysBetween(from, date) / 7);
    const startedAt = atLocal(date, hour, Math.round(rng() * 40));
    const swap = substitute?.(date, rng);
    // El sustituto trae su propia carga: no hereda la del ejercicio original.
    const exercises = routine.exercises.map((e) =>
      swap && e.name === swap.from
        ? { ...e, name: swap.to, substitutedFrom: e.name, baseKg: swap.baseKg ?? 0, stepKg: swap.stepKg ?? 0 }
        : e
    );
    const { sets, endMs } = buildSets(exercises, Date.parse(startedAt), week, rng);
    sessions.push({
      date,
      routineKey: routine.key,
      startedAt,
      finishedAt: new Date(endMs).toISOString(),
      rpe: 6 + Math.floor(rng() * 4),
      notes: NOTES[Math.floor(rng() * NOTES.length)],
      hasModifications: Boolean(swap),
      sets,
    });
  }
  return sessions;
}
