import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getStudent } from '@/api/students/students.api';
import { STUDENTS_KEY } from '@/hooks/students/useStudents';

/** `fetchStudent(id)` → la ficha (`GET /students/:id`), compartiendo la caché de `useStudentQuery`. */
export function useStudentPrefill() {
  const queryClient = useQueryClient();
  return useCallback(
    (id) => queryClient.fetchQuery({ queryKey: [...STUDENTS_KEY, id], queryFn: () => getStudent(id) }),
    [queryClient],
  );
}
