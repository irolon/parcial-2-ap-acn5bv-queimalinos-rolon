import { EMPTY_ROUTINE, makeExercise } from '@/utils/routines/editorState';
import { sortDays } from '@/utils/students/routineDays';

/**
 * Estado del editor desde un bloque de la propuesta, igual que `fromTemplate`: nombre del bloque, objetivo de la
 * generación, días y ejercicios (series, reps, descanso, peso y notas). Descarta y cuenta (`missing`) los ejercicios
 * que ya no están en `exercisesById` (la biblioteca ya cargada).
 */
export function fromBlock(block, goal, exercisesById = new Map()) {
  const items = block.exercises ?? [];
  const kept = items.filter((item) => exercisesById.has(item.exercise_id));
  return {
    missing: items.length - kept.length,
    state: {
      ...EMPTY_ROUTINE,
      name: block.name ?? '',
      goal: goal ?? '',
      days: sortDays(block.days),
      exercises: kept.map((item) => makeExercise(item.exercise_id, item)),
    },
  };
}

/** Índice de `?bloque=`: un entero no negativo, o `null` (vacío, ausente o cualquier otra cosa no es el bloque 0). */
export function blockIndexOf(raw) {
  return typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : null;
}

/**
 * Qué muestra el editor al arrancar con un bloque (`source` de `useAiBlock`, o `null`) y el borrador recuperado
 * (`found`, o `null`): `state` (o `null` = dejarlo como está), `ask` = el bloque convertido si hay que preguntar
 * antes de pisar el borrador, y `loaded` = el bloque convertido si se cargó directo. Si el borrador ya es ese bloque
 * (una recarga), se recupera sin preguntar.
 */
export function planBlockStart(source, found, exercisesById) {
  const block = source && !(found && source.draftIsBlock) ? fromBlock(source.block, source.goal, exercisesById) : null;
  if (!block) return { state: found?.state ?? null, ask: null, loaded: null };
  if (found) return { state: found.state, ask: block, loaded: null };
  return { state: block.state, ask: null, loaded: block };
}
