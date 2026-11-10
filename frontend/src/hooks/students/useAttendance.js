import { useQuery } from '@tanstack/react-query';
import { getAttendance } from '@/api/students/attendance.api';
import { STUDENTS_KEY } from '@/hooks/students/useStudents';

// Mantiene el mes anterior mientras llega el nuevo, solo si es del mismo alumno.
const samePerson = (id) => (prev, prevQuery) => (prevQuery?.queryKey[1] === id ? prev : undefined);

/**
 * Asistencia de un mes (`YYYY-MM`): sesiones, días planificados hasta hoy, sesiones con récord y el estado de cada
 * día. `keepPrevious`: al cambiar de mes deja el anterior (`isPlaceholderData`) hasta que llega el nuevo.
 */
export function useAttendanceQuery(id, month, { keepPrevious = false } = {}) {
  return useQuery({
    queryKey: [...STUDENTS_KEY, id, 'attendance', month],
    queryFn: () => getAttendance(id, month),
    enabled: Boolean(id && month),
    placeholderData: keepPrevious ? samePerson(id) : undefined,
  });
}
