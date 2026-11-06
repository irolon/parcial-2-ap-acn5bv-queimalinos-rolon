import { useCallback, useState } from 'react';
import { blockIndexOf, planBlockStart } from '@/utils/trainer-ai/blockEditor';
import { readAiSession, writeAiSession } from '@/utils/trainer-ai/proposalStore';

function findSource(trainerId, generationId, index) {
  if (!generationId || index === null) return null;
  const session = readAiSession(trainerId);
  if (session?.generationId !== generationId) return null;
  const block = session.proposal.routines[index];
  if (!block) return null;
  const editing = Number.isInteger(session.editing) ? session.editing : null;
  return {
    block,
    index,
    goal: session.form.goal ?? '',
    draftIsBlock: editing === index,
    draftBlockName: editing !== null && editing !== index ? (session.proposal.routines[editing]?.name ?? null) : null,
  };
}

/**
 * Bloque de la propuesta que el editor tiene que cargar (`?ia=<generationId>&bloque=<i>`), o `source: null` si no hay
 * o la propuesta guardada es otra. Se vuelve a buscar cuando cambian `ia`, `bloque` o el entrenador (`key`).
 * `source.draftIsBlock`: el borrador del editor es ese mismo bloque ya cargado (una recarga); `draftBlockName`: el
 * nombre de otro bloque de la propuesta que se estaba editando. `start(found, byId)` decide qué muestra el editor
 * (ver `planBlockStart`), `markLoaded()` lo anota, `markAssigned(student, { routineId, block })` lo marca "Asignado"
 * con lo que de verdad se asignó y `dismiss()` deja de tratarlo como bloque.
 */
export function useAiBlock(trainerId, params) {
  const generationId = params.get('ia');
  const index = blockIndexOf(params.get('bloque'));
  const key = `${trainerId}|${generationId}|${index}`;
  const [found, setFound] = useState(() => ({ key, source: findSource(trainerId, generationId, index) }));
  if (found.key !== key) setFound({ key, source: findSource(trainerId, generationId, index) });
  const source = found.key === key ? found.source : findSource(trainerId, generationId, index);

  const update = useCallback((fn) => {
    const session = readAiSession(trainerId);
    if (session?.generationId === generationId) writeAiSession(trainerId, fn(session));
  }, [trainerId, generationId]);

  const start = useCallback((draft, byId) => planBlockStart(source, draft, byId), [source]);
  const markLoaded = useCallback(() => update((s) => ({ ...s, editing: index })), [update, index]);
  const markAssigned = useCallback((student, { routineId = null, block } = {}) => update((s) => ({
    ...s,
    editing: null,
    assigned: { ...s.assigned, [index]: { studentId: student.id, studentName: student.name, routineId, block } },
  })), [update, index]);
  const dismiss = useCallback(() => setFound((f) => ({ ...f, source: null })), []);

  return { key, source, start, markLoaded, markAssigned, dismiss };
}
