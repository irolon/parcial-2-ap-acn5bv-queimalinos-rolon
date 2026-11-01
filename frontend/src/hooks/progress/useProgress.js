import { useQuery } from '@tanstack/react-query';
import { getBodyProgress, getExerciseProgress, getOverview } from '@/api/progress/progress.api';

export const PROGRESS_KEY = ['progress'];

/** Clave del progreso corporal de un alumno: la comparten `useBodyProgress` y las mutaciones de medidas. */
export const bodyProgressKey = (studentId) => [...PROGRESS_KEY, 'body', studentId];

export function useProgressOverview(studentId, range) {
  return useQuery({
    queryKey: [...PROGRESS_KEY, 'overview', studentId, range?.from ?? null, range?.to ?? null],
    queryFn: () => getOverview(studentId, range),
    enabled: Boolean(studentId),
    // Al cambiar el rango se mantiene el overview anterior (mismo alumno) para no desmontar la barra.
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[2] === studentId ? prev : undefined),
  });
}

export function useExerciseProgress(exerciseId, studentId, range) {
  return useQuery({
    queryKey: [...PROGRESS_KEY, 'exercise', exerciseId, studentId, range?.from ?? null, range?.to ?? null],
    queryFn: () => getExerciseProgress(exerciseId, studentId, range),
    enabled: Boolean(exerciseId) && Boolean(studentId),
  });
}

export function useBodyProgress(studentId) {
  return useQuery({
    queryKey: bodyProgressKey(studentId),
    queryFn: () => getBodyProgress(studentId),
    enabled: Boolean(studentId),
  });
}
