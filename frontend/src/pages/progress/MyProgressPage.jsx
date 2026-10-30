import ProgressPanel from '@/components/progress/ProgressPanel';
import { useAuthStore } from '@/hooks/auth/useAuthStore';

/** "Mi progreso": el panel de progresión del propio alumno, con sus medidas. */
export default function MyProgressPage() {
  const user = useAuthStore((s) => s.user);
  return <ProgressPanel studentId={user.id} showBody />;
}
