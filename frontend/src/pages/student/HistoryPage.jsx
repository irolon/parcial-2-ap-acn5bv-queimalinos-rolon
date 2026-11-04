import SessionsHistory from '@/components/sessions/SessionsHistory';
import { useAuthStore } from '@/hooks/auth/useAuthStore';

/** Historial del alumno: sus sesiones con el detalle, su nota y el comentario de su entrenador (de solo lectura). */
export default function HistoryPage() {
  const studentId = useAuthStore((state) => state.user?.id);
  return <SessionsHistory studentId={studentId} viewer="student" />;
}
