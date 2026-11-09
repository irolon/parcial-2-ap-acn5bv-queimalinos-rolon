import { useQuery } from '@tanstack/react-query';
import { getOverview } from '@/api/students/overview.api';
import { STUDENTS_KEY } from '@/hooks/students/useStudents';

/** Bajo `STUDENTS_KEY`: cualquier cambio de alumnos lo invalida. */
export const OVERVIEW_KEY = [...STUDENTS_KEY, 'overview'];

/** El resumen del Dashboard del entrenador (`GET /students/overview`). */
export function useStudentsOverview() {
  return useQuery({ queryKey: OVERVIEW_KEY, queryFn: getOverview });
}
