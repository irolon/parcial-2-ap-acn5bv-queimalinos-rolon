import { useCallback, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createSession, uploadSets } from '@/api/sessions/sessions.api';
import { PROGRESS_KEY } from '@/hooks/progress/useProgress';
import { TODAY_ROUTINE_KEY } from '@/hooks/routines/useStudentRoutines';
import { SESSIONS_KEY } from '@/hooks/sessions/useSessions';
import { uploadWorkout } from '@/utils/workout/uploadWorkout';
import {
  adjustRest, finishWorkout, registerSet, removeSet, setCursor, setFeedback, skipRest, startWorkout,
} from '@/utils/workout/workoutState';
import { readWorkout, subscribeWorkout, trackUpload, writeWorkout } from './workoutStore';

const api = { createSession, uploadSets };

// Lo que cambia al guardar un entrenamiento: historial, progreso, la rutina del día (`last_session_kg`) y racha,
// logros y desafíos. Las tres últimas son las claves de la #42 (`hooks/achievements/useStudentGamification.js`).
const staleAfterUpload = (studentId) => [
  [...SESSIONS_KEY, studentId],
  PROGRESS_KEY,
  TODAY_ROUTINE_KEY,
  ['student-streak', studentId],
  ['student-achievements', studentId],
  ['student-challenges', studentId],
];

/**
 * La sesión en curso del alumno (`workout`, o null) y sus acciones. Vive en memoria compartida por todas las páginas
 * y se guarda en localStorage en cada cambio (ft.workout.<studentId>). Sin `studentId` no hace nada.
 * - `start(routine)` no pisa una sesión abierta: si hay una, devuelve esa (la página ofrece Continuar o Descartar).
 * - Las acciones devuelven el estado nuevo (o null sin sesión).
 * - `upload()` fija finished_at si faltaba, sube y, si sale bien, borra la sesión y refresca lo que cambió.
 *   Devuelve `{ ok, state, failed, unlocked, error? }` (ver `uploadWorkout`), o null si no hay nada para subir.
 */
export function useActiveWorkout(studentId) {
  const queryClient = useQueryClient();
  const workout = useSyncExternalStore(subscribeWorkout, () => (studentId ? readWorkout(studentId) : null));

  const change = useCallback((update) => {
    const current = studentId ? readWorkout(studentId) : null;
    if (!current) return null;
    const next = update(current);
    if (next !== current) writeWorkout(studentId, next);
    return next;
  }, [studentId]);

  const start = useCallback((routine) => {
    if (!studentId) return null;
    const open = readWorkout(studentId);
    if (open) return open;
    const created = startWorkout(routine);
    if (created) writeWorkout(studentId, created);
    return created;
  }, [studentId]);

  const register = useCallback((kg, reps) => change((s) => registerSet(s, { kg, reps }, new Date())), [change]);
  const remove = useCallback((setId) => change((s) => removeSet(s, setId)), [change]);
  const goTo = useCallback((index) => change((s) => setCursor(s, index)), [change]);
  const next = useCallback(() => change((s) => setCursor(s, s.cursor + 1)), [change]);
  const prev = useCallback(() => change((s) => setCursor(s, s.cursor - 1)), [change]);
  const adjust = useCallback((seconds) => change((s) => adjustRest(s, seconds, new Date())), [change]);
  const skip = useCallback(() => change(skipRest), [change]);
  const finish = useCallback(() => change((s) => finishWorkout(s, new Date())), [change]);
  const feedback = useCallback((value) => change((s) => setFeedback(s, value)), [change]);

  const discard = useCallback(() => {
    if (studentId) writeWorkout(studentId, null);
  }, [studentId]);

  const upload = useCallback(() => {
    if (!studentId || !readWorkout(studentId)) return Promise.resolve(null);
    return trackUpload(studentId, async () => {
      const ready = change((s) => finishWorkout(s, new Date()));
      if (!ready) return null;
      // La subida solo es dueña de `upload`: se guarda sobre lo que haya en memoria. Si mientras sube la descartan
      // (o empieza otra), lo que avanza no la vuelve a guardar.
      const isCurrent = (state) => readWorkout(studentId)?.id === state.id;
      const keepProgress = (state) => {
        if (isCurrent(state)) writeWorkout(studentId, { ...readWorkout(studentId), upload: state.upload });
      };
      const result = await uploadWorkout({ api, state: ready, onState: keepProgress });
      if (result.ok) {
        if (isCurrent(ready)) writeWorkout(studentId, null);
        staleAfterUpload(studentId).forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      }
      return result;
    });
  }, [studentId, change, queryClient]);

  return {
    workout,
    start,
    register,
    remove,
    goTo,
    next,
    prev,
    adjustRest: adjust,
    skipRest: skip,
    finish,
    setFeedback: feedback,
    discard,
    upload,
  };
}
