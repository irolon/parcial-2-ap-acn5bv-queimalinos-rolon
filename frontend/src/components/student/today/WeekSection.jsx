import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import WeekCard from '@/components/student/today/WeekCard';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useMyRoutines } from '@/hooks/routines/useStudentRoutines';
import { useSessionsInfinite } from '@/hooks/sessions/useSessions';
import { weekStrip } from '@/utils/routines/week';

/**
 * "Esta semana" con sus datos: los días de las rutinas activas y las sesiones del historial (alcanza con la
 * primera página, de a 20). Tiene su propia carga y su propio error con Reintentar.
 */
export default function WeekSection({ now }) {
  const studentId = useAuthStore((state) => state.user?.id);
  const routines = useMyRoutines();
  const sessions = useSessionsInfinite(studentId);

  if (routines.isError || sessions.isError) {
    const retry = () => [routines, sessions].filter((query) => query.isError).forEach((query) => query.refetch());
    return <Card title="Esta semana"><ErrorState message="No pudimos cargar tu semana." onRetry={retry} /></Card>;
  }
  if (routines.isPending || sessions.isPending) {
    return <Card title="Esta semana"><LoadingState rows={1} label="Cargando tu semana…" /></Card>;
  }
  const strip = weekStrip({
    routineDays: (routines.data ?? []).flatMap((routine) => routine.days ?? []),
    sessions: sessions.data?.pages[0]?.data ?? [],
    now,
  });
  return <WeekCard strip={strip} />;
}
