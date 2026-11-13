import { EMPTY_ROUTINE, makeExercise } from '@/utils/routines/editorState';
import { sortDays } from '@/utils/students/routineDays';

/**
 * Estado del editor desde un bloque de la propuesta, igual que `fromTemplate`: nombre del bloque, objetivo y nivel de la
 * generación (`level` vacío = sin definir), días y ejercicios (series, reps, descanso, peso y notas). Descarta y cuenta (`missing`) los ejercicios
 * que ya no están en `exercisesById` (la biblioteca ya cargada).
 */
export function fromBlock(block, goal, exercisesById = new Map(), level = '') {
  const items = block.exercises ?? [];
  const kept = items.filter((item) => exercisesById.has(item.exercise_id));
  return {
    missing: items.length - kept.length,
    state: {
      ...EMPTY_ROUTINE,
      name: block.name ?? '',
      goal: goal ?? '',
      level: level ?? '',
      days: sortDays(block.days),
      exercises: kept.map((item) => makeExercise(item.exercise_id, item)),
    },
  };
}

/** Índice de `?bloque=`: un entero no negativo, o `null` (vacío, ausente o cualquier otra cosa no es el bloque 0). */
export function blockIndexOf(raw) {
  return typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : null;
}

/** Nombre de otro bloque de la misma propuesta si el borrador salió de él (`null` si es el mismo o uno a mano). */
function otherBlockName(source, mark) {
  if (mark?.generationId !== source.generationId || mark.index === source.index) return null;
  return source.names?.[mark.index] ?? null;
}

/**
 * Qué muestra el editor al arrancar con un bloque (`source` de `useAiBlock`, o `null`) y el borrador recuperado
 * (`found`, o `null`): `state` (o `null` = dejarlo como está), `ask` = el bloque convertido si hay que preguntar
 * antes de pisar el borrador, `loaded` = el bloque convertido si se cargó directo y `draftBlockName` = el nombre del
 * otro bloque de la propuesta que es el borrador (para la pregunta). El bloque convertido lleva su marca (`aiBlock`),
 * que se guarda con el borrador: si el borrador ya es ese bloque (una recarga), se recupera sin preguntar.
 */
export function planBlockStart(source, found, exercisesById) {
  const mark = found?.state?.aiBlock ?? null;
  const isBlock = Boolean(source && mark && mark.generationId === source.generationId && mark.index === source.index);
  const block = source && !(found && isBlock) ? fromBlock(source.block, source.goal, exercisesById, source.level) : null;
  if (!block) return { state: found?.state ?? null, ask: null, loaded: null, draftBlockName: null };
  const marked = { ...block, state: { ...block.state, aiBlock: { generationId: source.generationId, index: source.index } } };
  if (found) return { state: found.state, ask: marked, loaded: null, draftBlockName: otherBlockName(source, mark) };
  return { state: marked.state, ask: null, loaded: marked, draftBlockName: null };
}
