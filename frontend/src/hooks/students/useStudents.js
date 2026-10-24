import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getStudent, listStudents, updateStudent } from '@/api/students/students.api';

export const STUDENTS_KEY = ['students'];

export function useStudentsQuery({ active } = {}) {
  return useQuery({ queryKey: [...STUDENTS_KEY, { active }], queryFn: () => listStudents({ active }) });
}

export function useStudentQuery(id) {
  return useQuery({ queryKey: [...STUDENTS_KEY, id], queryFn: () => getStudent(id), enabled: Boolean(id) });
}

/** PATCH del alumno; refresca el listado y la ficha. */
export function useUpdateStudent(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => updateStudent(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STUDENTS_KEY }),
  });
}
