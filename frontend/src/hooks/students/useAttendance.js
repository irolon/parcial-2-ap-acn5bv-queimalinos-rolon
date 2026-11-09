import { useQuery } from '@tanstack/react-query';
import { getAttendance } from '@/api/students/attendance.api';
import { STUDENTS_KEY } from '@/hooks/students/useStudents';

/** Asistencia de un mes (`YYYY-MM`): sesiones, días planificados hasta hoy y sesiones con récord. */
export function useAttendanceQuery(id, month) {
  return useQuery({
    queryKey: [...STUDENTS_KEY, id, 'attendance', month],
    queryFn: () => getAttendance(id, month),
    enabled: Boolean(id && month),
  });
}
