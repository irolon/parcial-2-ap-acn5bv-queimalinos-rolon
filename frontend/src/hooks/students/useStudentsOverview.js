import { useQuery } from '@tanstack/react-query';
import { getOverview } from '@/api/students/overview.api';
import { STUDENTS_KEY } from '@/hooks/students/useStudents';

/** Bajo `STUDENTS_KEY`: cualquier cambio de alumnos lo invalida. */
export const OVERVIEW_KEY = [...STUDENTS_KEY, 'overview'];

/** Cada cuánto se refresca mientras el Dashboard está abierto ("En curso" de GX4). */
export const OVERVIEW_REFETCH_MS = 60_000;

/** El resumen del Dashboard del entrenador (`GET /students/overview`), refrescado cada minuto. */
export function useStudentsOverview() {
  return useQuery({ queryKey: OVERVIEW_KEY, queryFn: getOverview, refetchInterval: OVERVIEW_REFETCH_MS });
}
