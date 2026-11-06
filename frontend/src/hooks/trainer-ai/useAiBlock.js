import { useCallback, useState } from 'react';
import { readAiSession, writeAiSession } from '@/utils/trainer-ai/proposalStore';

function findSource(trainerId, generationId, index) {
  if (!generationId || !Number.isInteger(index)) return null;
  const session = readAiSession(trainerId);
  const block = session?.generationId === generationId ? session.proposal?.routines?.[index] : null;
  return block ? { block, index, goal: session.form?.goal ?? '', draftIsBlock: session.editing === index } : null;
}

/**
 * Bloque de la propuesta que el editor tiene que cargar (`?ia=<generationId>&bloque=<i>`), o `source: null` si no hay
 * o la propuesta guardada es otra. `draftIsBlock`: el borrador del editor es ese mismo bloque ya cargado (una recarga).
 * `markLoaded()` lo anota, `markAssigned(student, { routineId, block })` lo marca "Asignado" con lo que de verdad se
 * asignó y `dismiss()` deja de tratarlo como bloque.
 */
export function useAiBlock(trainerId, params) {
  const generationId = params.get('ia');
  const index = Number(params.get('bloque') ?? NaN);
  const [source, setSource] = useState(() => findSource(trainerId, generationId, index));

  const update = useCallback((fn) => {
    const session = readAiSession(trainerId);
    if (session?.generationId === generationId) writeAiSession(trainerId, fn(session));
  }, [trainerId, generationId]);

  const markLoaded = useCallback(() => update((s) => ({ ...s, editing: index })), [update, index]);
  const markAssigned = useCallback((student, { routineId = null, block } = {}) => update((s) => ({
    ...s,
    editing: null,
    assigned: { ...s.assigned, [index]: { studentId: student.id, studentName: student.name, routineId, block } },
  })), [update, index]);
  const dismiss = useCallback(() => setSource(null), []);

  return { source, markLoaded, markAssigned, dismiss };
}
