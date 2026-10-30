import { useQuery } from '@tanstack/react-query';
import { getBodyProgress, getExerciseProgress, getOverview } from '@/api/progress/progress.api';

export const PROGRESS_KEY = ['progress'];

export function useProgressOverview(studentId, range) {
  return useQuery({
    queryKey: [...PROGRESS_KEY, 'overview', studentId, range?.from ?? null, range?.to ?? null],
    queryFn: () => getOverview(studentId, range),
    enabled: Boolean(studentId),
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
    queryKey: [...PROGRESS_KEY, 'body', studentId],
    queryFn: () => getBodyProgress(studentId),
    enabled: Boolean(studentId),
  });
}
