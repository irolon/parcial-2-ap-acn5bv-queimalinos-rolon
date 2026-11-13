import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getStudent, listStudents, updateStudent } from '@/api/students/students.api';

export const STUDENTS_KEY = ['students'];

/**
 * La lista de alumnos. Se vuelve a pedir al volver a la pestaña (la app lo tiene apagado en general): así "Entrenando
 * ahora" aparece o se va si un alumno empezó o terminó mientras el PT estaba en otra pestaña.
 */
export function useStudentsQuery({ active, enabled = true } = {}) {
  return useQuery({
    queryKey: [...STUDENTS_KEY, { active }],
    queryFn: () => listStudents({ active }),
    enabled,
    refetchOnWindowFocus: true,
  });
}

/**
 * Si el entrenador no tiene ningún alumno, ni activo ni dado de baja, a partir de la consulta de activos
 * (`null` cuando la página no está mirando activos). Los de baja se piden solo si no hay activos:
 * `checking` es true mientras se espera esa respuesta, para no mostrar la invitación antes de tiempo.
 */
export function useNoStudents(activeQuery) {
  const noActive = Boolean(activeQuery?.isSuccess && activeQuery.data.length === 0);
  const disabled = useStudentsQuery({ active: false, enabled: noActive });
  return {
    none: noActive && disabled.isSuccess && disabled.data.length === 0,
    checking: noActive && disabled.isPending,
  };
}

export function useStudentQuery(id) {
  return useQuery({ queryKey: [...STUDENTS_KEY, id], queryFn: () => getStudent(id), enabled: Boolean(id) });
}

/**
 * PATCH del alumno; refresca el listado y la ficha aunque falle: la baja se guarda antes de cancelar
 * los turnos, así que un 500 puede llegar con el alumno ya inactivo.
 */
export function useUpdateStudent(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => updateStudent(id, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: STUDENTS_KEY }),
  });
}
