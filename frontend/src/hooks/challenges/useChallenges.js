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

/**
 * Asigna a varios alumnos; refresca desafíos, alumnos y la ficha de cada alumno pedido que no se salteó
 * (las asignaciones de `created` no traen `student_id`, por eso se parte de los ids de la mutación).
 */
export function useAssignChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentIds }) => assignChallenge(id, studentIds),
    onSuccess: (result, { studentIds }) => {
      const skipped = new Set(result.skipped.map((s) => s.student_id));
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: CHALLENGES_KEY }),
        queryClient.invalidateQueries({ queryKey: STUDENTS_KEY }),
        ...studentIds
          .filter((id) => !skipped.has(id))
          .map((id) => queryClient.invalidateQueries({ queryKey: ['student-challenges', id] })),
      ]);
    },
  });
}
