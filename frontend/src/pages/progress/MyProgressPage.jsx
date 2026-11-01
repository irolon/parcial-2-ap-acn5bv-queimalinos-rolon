import MyAchievements from '@/components/achievements/MyAchievements';
import ProgressPanel from '@/components/progress/ProgressPanel';
import { useAuthStore } from '@/hooks/auth/useAuthStore';

/**
 * "Mi progreso": el panel de progresión del propio alumno, con sus medidas, y debajo "Racha y logros".
 * Cada parte carga y falla por su cuenta.
 */
export default function MyProgressPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <ProgressPanel studentId={user.id} showBody />
      <MyAchievements studentId={user.id} />
    </div>
  );
}
