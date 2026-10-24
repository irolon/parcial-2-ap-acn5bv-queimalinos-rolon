import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createExercise, deleteExercise, listExercises, updateExercise } from '@/api/exercises/exercises.api';

export const EXERCISES_KEY = ['exercises'];

export function useExercisesQuery() {
  return useQuery({ queryKey: EXERCISES_KEY, queryFn: listExercises });
}

/** Mutación que refresca la biblioteca al terminar bien. */
function useInvalidatingMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EXERCISES_KEY }),
  });
}

export const useCreateExercise = () => useInvalidatingMutation(createExercise);
export const useUpdateExercise = () => useInvalidatingMutation(({ id, body }) => updateExercise(id, body));
export const useDeleteExercise = () => useInvalidatingMutation(deleteExercise);
