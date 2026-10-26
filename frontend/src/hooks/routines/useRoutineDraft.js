import { useEffect, useState } from 'react';
import { writeDraft } from '@/utils/routines/draft';
import { EMPTY_ROUTINE } from '@/utils/routines/editorState';

/** Guarda el borrador (debounce) cuando cambia `state`; no escribe el estado vacío. */
export function useRoutineDraft(trainerId, state, { delay = 1000 } = {}) {
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (!trainerId || state === EMPTY_ROUTINE) return undefined;
    const timer = setTimeout(() => {
      writeDraft(trainerId, state);
      setSavedAt(new Date());
    }, delay);
    return () => clearTimeout(timer);
  }, [trainerId, state, delay]);

  return { savedAt };
}
