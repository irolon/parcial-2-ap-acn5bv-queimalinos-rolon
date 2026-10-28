import { useCallback, useEffect, useRef, useState } from 'react';
import { clearDraft, writeDraft } from '@/utils/routines/draft';
import { isBlank } from '@/utils/routines/editorState';

/**
 * Guarda el borrador (debounce) cuando cambia `state`; si quedó vacío, lo borra.
 * Lo pendiente también se vuelca al desmontar y en `beforeunload`, para no perder el último segundo.
 * La página debe pasar `enabled: false` hasta terminar de intentar restaurar el borrador
 * (biblioteca cargada y restauración hecha); mientras tanto no escribe ni borra.
 * Devuelve `savedAt` y `cancel()`, que descarta lo pendiente (p. ej. al asignar, cuando el borrador ya se borró).
 */
export function useRoutineDraft(trainerId, state, { delay = 1000, enabled = true } = {}) {
  const [savedAt, setSavedAt] = useState(null);
  const pending = useRef(null);

  const flush = useCallback((notify) => {
    const job = pending.current;
    pending.current = null;
    if (!job) return;
    if (isBlank(job.state)) {
      clearDraft(job.trainerId);
      if (notify) setSavedAt(null);
    } else {
      writeDraft(job.trainerId, job.state);
      if (notify) setSavedAt(new Date());
    }
  }, []);

  useEffect(() => {
    if (!enabled || !trainerId || !state) {
      pending.current = null;
      return undefined;
    }
    pending.current = { trainerId, state };
    const timer = setTimeout(() => flush(true), delay);
    return () => clearTimeout(timer);
  }, [trainerId, state, delay, enabled, flush]);

  useEffect(() => {
    const onUnload = () => flush(false);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      flush(false);
    };
  }, [flush]);

  const cancel = useCallback(() => {
    pending.current = null;
  }, []);

  return { savedAt, cancel };
}
