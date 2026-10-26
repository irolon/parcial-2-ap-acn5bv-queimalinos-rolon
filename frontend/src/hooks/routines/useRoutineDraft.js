import { useEffect, useState } from 'react';
import { clearDraft, writeDraft } from '@/utils/routines/draft';
import { isBlank } from '@/utils/routines/editorState';

/**
 * Guarda el borrador (debounce) cuando cambia `state`; si quedó vacío, lo borra.
 * La página debe pasar `enabled: false` hasta terminar de intentar restaurar el borrador
 * (biblioteca cargada y restauración hecha); mientras tanto no escribe ni borra.
 */
export function useRoutineDraft(trainerId, state, { delay = 1000, enabled = true } = {}) {
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (!enabled || !trainerId || !state) return undefined;
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
  }, [trainerId, state, delay, enabled]);

  return { savedAt };
}
