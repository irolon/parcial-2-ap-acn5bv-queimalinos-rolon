import MyAchievements from '@/components/achievements/MyAchievements';
import ProgressPanel from '@/components/progress/ProgressPanel';
import CompareCard from '@/components/progress/compare/CompareCard';
import StudentProgressKpis from '@/components/students/commitment/StudentProgressKpis';
import { useAuthStore } from '@/hooks/auth/useAuthStore';

/**
 * "Mi progreso": los indicadores del mes, la progresión comparada, el panel de progresión del propio alumno, con sus
 * medidas, y debajo "Racha y logros".
 * Cada parte carga y falla por su cuenta.
 */
export default function MyProgressPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <StudentProgressKpis studentId={user.id} />
      <CompareCard studentId={user.id} />
      <ProgressPanel studentId={user.id} showBody viewer="student" />
      <MyAchievements studentId={user.id} />
    </div>
  );
}
