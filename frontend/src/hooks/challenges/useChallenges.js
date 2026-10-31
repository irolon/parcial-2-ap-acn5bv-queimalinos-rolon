import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignChallenge,
  createChallenge,
  deleteChallenge,
  getActiveStudents,
  listChallenges,
} from '@/api/challenges/challenges.api';
import { STUDENTS_KEY } from '@/hooks/students/useStudents';

export const CHALLENGES_KEY = ['challenges'];

export function useChallengesQuery() {
  return useQuery({ queryKey: CHALLENGES_KEY, queryFn: listChallenges });
}

/** Ids de alumnos con el desafío en curso. */
export function useActiveStudentsQuery(id) {
  return useQuery({
    queryKey: [...CHALLENGES_KEY, id, 'active-students'],
    queryFn: () => getActiveStudents(id),
    enabled: Boolean(id),
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createChallenge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHALLENGES_KEY }),
  });
}

export function useDeleteChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteChallenge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHALLENGES_KEY }),
  });
}

/** Asigna a varios alumnos; refresca desafíos, alumnos y los desafíos de cada alumno creado. */
export function useAssignChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentIds }) => assignChallenge(id, studentIds),
    onSuccess: (result) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: CHALLENGES_KEY }),
        queryClient.invalidateQueries({ queryKey: STUDENTS_KEY }),
        ...result.created.map((c) => queryClient.invalidateQueries({ queryKey: ['student-challenges', c.student_id] })),
      ]),
  });
}
