import { useState } from 'react';
import MyAchievements from '@/components/achievements/MyAchievements';
import ProgressPanel from '@/components/progress/ProgressPanel';
import CompareCard from '@/components/progress/compare/CompareCard';
import ExerciseDetailCard from '@/components/progress/detail/ExerciseDetailCard';
import AttendanceCard from '@/components/students/attendance/AttendanceCard';
import StudentProgressKpis from '@/components/students/commitment/StudentProgressKpis';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { DEFAULT_COMPARE_METRIC } from '@/utils/progress/compare';
import { DEFAULT_RANGE } from '@/utils/progress/ranges';

/**
 * "Mi progreso": los indicadores del mes; la progresión comparada y el detalle por ejercicio en una fila, con el
 * rango y la métrica compartidos (si la comparada se oculta, el detalle ocupa la fila); el calendario de asistencia;
 * el panel de progresión del propio alumno, con sus medidas, y debajo "Racha y logros".
 * Cada parte carga y falla por su cuenta.
 */
export default function MyProgressPage() {
  const user = useAuthStore((s) => s.user);
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [metric, setMetric] = useState(DEFAULT_COMPARE_METRIC);
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <StudentProgressKpis studentId={user.id} />
      {/* Sin comparada ni detalle (alumno nuevo) la fila queda vacía: se oculta para no sumar otro gap-5. */}
      <div className="grid grid-cols-1 gap-5 empty:hidden lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <CompareCard studentId={user.id} range={range} onRange={setRange} metric={metric} onMetric={setMetric} />
        <ExerciseDetailCard studentId={user.id} range={range} metric={metric} className="lg:[&:only-child]:col-span-2" />
      </div>
      <AttendanceCard studentId={user.id} />
      <ProgressPanel studentId={user.id} showBody viewer="student" />
      <MyAchievements studentId={user.id} />
    </div>
  );
}
