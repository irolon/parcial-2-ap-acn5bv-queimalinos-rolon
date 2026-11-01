import { useQuery } from '@tanstack/react-query';
import {
  getStudentAchievements,
  getStudentChallenges,
  getStudentStreak,
  listAchievements,
} from '@/api/achievements/achievements.api';

// Prefijos de las claves por alumno (`[...PREFIJO, id]`). Quien cambia los datos del alumno (subir un entrenamiento,
// asignarle un desafío, pasar de día) invalida con estas constantes y no con el texto suelto, así no se desfasan.
export const STUDENT_STREAK_KEY = ['student-streak'];
export const STUDENT_ACHIEVEMENTS_KEY = ['student-achievements'];
export const STUDENT_CHALLENGES_KEY = ['student-challenges'];

export function useAchievementsCatalog() {
  return useQuery({ queryKey: ['achievements'], queryFn: listAchievements });
}

export function useStudentAchievementsQuery(id) {
  return useQuery({
    queryKey: [...STUDENT_ACHIEVEMENTS_KEY, id],
    queryFn: () => getStudentAchievements(id),
    enabled: Boolean(id),
  });
}

export function useStudentStreakQuery(id) {
  return useQuery({ queryKey: [...STUDENT_STREAK_KEY, id], queryFn: () => getStudentStreak(id), enabled: Boolean(id) });
}

export function useStudentChallengesQuery(id) {
  return useQuery({
    queryKey: [...STUDENT_CHALLENGES_KEY, id],
    queryFn: () => getStudentChallenges(id),
    enabled: Boolean(id),
  });
}
