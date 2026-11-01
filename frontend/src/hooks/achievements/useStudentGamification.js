import { useQuery } from '@tanstack/react-query';
import { getStudentStreak } from '@/api/achievements/achievements.api';

/** La racha del alumno. La clave es la que invalida `useActiveWorkout` al subir un entrenamiento. */
export function useStudentStreakQuery(id) {
  return useQuery({ queryKey: ['student-streak', id], queryFn: () => getStudentStreak(id), enabled: Boolean(id) });
}
