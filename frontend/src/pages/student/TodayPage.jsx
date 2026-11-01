import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import ActiveWorkoutCard from '@/components/student/today/ActiveWorkoutCard';
import NoRoutineCard from '@/components/student/today/NoRoutineCard';
import PlanTable from '@/components/student/today/PlanTable';
import RoutineHero from '@/components/student/today/RoutineHero';
import TodayHeader from '@/components/student/today/TodayHeader';
import WeekSection from '@/components/student/today/WeekSection';
import { useStudentStreakQuery } from '@/hooks/achievements/useStudentGamification';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useMyRoutines, useTodayRoutine } from '@/hooks/routines/useStudentRoutines';
import { useToday } from '@/hooks/shared/useToday';

// Con una sesión en curso, Hoy siempre deja volver a ella, aunque la rutina del día no esté (cargando, con error,
// día de descanso o sin rutina asignada); cuando está, la tarjeta de la rutina ya trae Continuar y Descartar.
function RoutineSection({ today, routines, now }) {
  if (today.data) {
    return (
      <>
        <RoutineHero routine={today.data} now={now} />
        <PlanTable exercises={today.data.exercises} />
      </>
    );
  }
  let content = <NoRoutineCard routines={routines} now={now} />;
  if (today.isPending) {
    content = <Card><LoadingState rows={3} label="Cargando tu rutina de hoy…" /></Card>;
  } else if (today.isError) {
    content = <Card><ErrorState message="No pudimos cargar tu rutina de hoy." onRetry={() => today.refetch()} /></Card>;
  }
  return (
    <>
      <ActiveWorkoutCard />
      {content}
    </>
  );
}

/** Hoy: el saludo con la racha, la rutina del día (o por qué no hay) con su plan, y la semana. */
export default function TodayPage() {
  const user = useAuthStore((state) => state.user);
  const now = useToday();
  const today = useTodayRoutine();
  const routines = useMyRoutines();
  const streak = useStudentStreakQuery(user.id);

  return (
    <div className="flex flex-col gap-5">
      <TodayHeader name={user.name} now={now} streakDays={streak.data?.current_streak_days} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(230px,1fr)]">
        <div className="flex min-w-0 flex-col gap-3.5">
          <RoutineSection today={today} routines={routines} now={now} />
        </div>
        <WeekSection now={now} />
      </div>
    </div>
  );
}
