import { useEffect, useState } from 'react';
import { clearDraft, writeDraft } from '@/utils/routines/draft';
import { isBlank } from '@/utils/routines/editorState';

/** Guarda el borrador (debounce) cuando cambia `state`; si quedó vacío, lo borra. */
export function useRoutineDraft(trainerId, state, { delay = 1000 } = {}) {
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (!trainerId || !state) return undefined;
    const timer = setTimeout(() => {
      if (isBlank(state)) {
        clearDraft(trainerId);
        setSavedAt(null);
      } else {
        writeDraft(trainerId, state);
        setSavedAt(new Date());
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [trainerId, state, delay]);

  return { savedAt };
}
