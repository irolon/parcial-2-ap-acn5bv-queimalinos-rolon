import { useQuery } from '@tanstack/react-query';
import {
  getStudentAchievements,
  getStudentChallenges,
  getStudentStreak,
  listAchievements,
} from '@/api/achievements/achievements.api';

export function useAchievementsCatalog() {
  return useQuery({ queryKey: ['achievements'], queryFn: listAchievements });
}

export function useStudentAchievementsQuery(id) {
  return useQuery({ queryKey: ['student-achievements', id], queryFn: () => getStudentAchievements(id), enabled: Boolean(id) });
}

export function useStudentStreakQuery(id) {
  return useQuery({ queryKey: ['student-streak', id], queryFn: () => getStudentStreak(id), enabled: Boolean(id) });
}

export function useStudentChallengesQuery(id) {
  return useQuery({ queryKey: ['student-challenges', id], queryFn: () => getStudentChallenges(id), enabled: Boolean(id) });
}
