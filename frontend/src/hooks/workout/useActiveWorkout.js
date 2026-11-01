import { useCallback, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createSession, uploadSets } from '@/api/sessions/sessions.api';
import {
  ACHIEVEMENT_PROGRESS_KEY, STUDENT_ACHIEVEMENTS_KEY, STUDENT_CHALLENGES_KEY, STUDENT_STREAK_KEY,
} from '@/hooks/achievements/useStudentGamification';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { PROGRESS_KEY } from '@/hooks/progress/useProgress';
import { TODAY_ROUTINE_KEY } from '@/hooks/routines/useStudentRoutines';
import { SESSIONS_KEY } from '@/hooks/sessions/useSessions';
import { uploadWorkout } from '@/utils/workout/uploadWorkout';
import {
  adjustRest, finishWorkout, readyToUpload, registerSet, removeSet, setCursor, setFeedback, skipRest, startWorkout,
} from '@/utils/workout/workoutState';
import { readWorkout, subscribeWorkout, trackUpload, writeWorkout } from './workoutStore';

const api = { createSession, uploadSets };

// Lo que cambia al guardar un entrenamiento: historial, progreso, la rutina del día (`last_session_kg`) y racha,
// logros (los desbloqueados y su avance) y desafíos (las claves de `hooks/achievements/useStudentGamification.js`).
const staleAfterUpload = (studentId) => [
  [...SESSIONS_KEY, studentId],
  PROGRESS_KEY,
  TODAY_ROUTINE_KEY,
  [...STUDENT_STREAK_KEY, studentId],
  [...STUDENT_ACHIEVEMENTS_KEY, studentId],
  [...STUDENT_CHALLENGES_KEY, studentId],
  [...ACHIEVEMENT_PROGRESS_KEY, studentId],
];

/**
 * La sesión en curso del alumno (`workout`, o null) y sus acciones. Vive en memoria compartida por todas las páginas
 * y se guarda en localStorage en cada cambio (ft.workout.<studentId>). Sin `studentId` no hace nada.
 * - `start(routine)` no pisa una sesión abierta: si hay una, devuelve esa (la página ofrece Continuar o Descartar).
 * - Las acciones devuelven el estado nuevo (o null sin sesión). `register` no registra un peso ilegible ni reps
 *   que no son número: devuelve el mismo estado.
 * - `upload()` fija finished_at y el feedback ("Saltar") si faltaban, sube y, si sale bien, borra la sesión y
 *   refresca lo que cambió. Si la descartan mientras sube, o deja de ser este alumno el que inició sesión, no sale
 *   ningún pedido más (`cancelled: true`) y se cortan los que estaban en vuelo.
 *   Devuelve `{ ok, cancelled?, state, failed, unlocked, error? }` (ver `uploadWorkout`), o null si no hay sesión.
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
  const skip = useCallback(() => change((s) => skipRest(s, new Date())), [change]);
  const finish = useCallback(() => change((s) => finishWorkout(s, new Date())), [change]);
  const feedback = useCallback((value) => change((s) => setFeedback(s, value)), [change]);

  const discard = useCallback(() => {
    if (studentId) writeWorkout(studentId, null);
  }, [studentId]);

  const upload = useCallback(() => {
    const open = studentId ? readWorkout(studentId) : null;
    if (!open) return Promise.resolve(null);
    const { id } = open;
    // Si la descartan mientras sube (o empieza otra), no sale ningún pedido más y lo que avanza no la vuelve a guardar.
    // Tampoco si ya no es este alumno el que inició sesión: el cliente manda el token de quien esté ahora.
    const isCurrent = () => useAuthStore.getState().user?.id === studentId && readWorkout(studentId)?.id === id;
    return trackUpload(`${studentId}:${id}`, async (signal) => {
      if (!isCurrent()) return null;
      const ready = change((s) => readyToUpload(s, new Date()));
      // La subida solo es dueña de `upload`: se guarda sobre lo que haya en memoria (el cursor puede haber cambiado).
      const keepProgress = (state) => {
        if (isCurrent()) writeWorkout(studentId, { ...readWorkout(studentId), upload: state.upload });
      };
      const result = await uploadWorkout({ api, state: ready, onState: keepProgress, shouldContinue: isCurrent, signal });
      if (result.ok && isCurrent()) writeWorkout(studentId, null);
      // Se refresca si la sesión quedó en el servidor y la copia local dejó de valer: subida entera, o descartada a mitad.
      if (result.ok || (result.cancelled && result.state.upload.sessionCreated)) {
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
