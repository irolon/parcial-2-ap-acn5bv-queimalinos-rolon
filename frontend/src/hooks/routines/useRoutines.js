import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createRoutine, listRoutines } from '@/api/routines/routines.api';
import { STUDENTS_KEY } from '@/hooks/students/useStudents';

export const ROUTINES_KEY = ['routines'];

export function useRoutinesQuery() {
  return useQuery({ queryKey: ROUTINES_KEY, queryFn: listRoutines });
}

/** POST de la rutina; refresca rutinas y alumnos (rutina activa). */
export function useCreateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRoutine,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ROUTINES_KEY }),
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY }),
    ]),
  });
}
