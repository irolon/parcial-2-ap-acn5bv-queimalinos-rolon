import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import QueryState from '@/components/shared/states/QueryState';
import Card from '@/components/shared/ui/Card';
import FirstInvitationCta from '@/components/students/FirstInvitationCta';
import InactivityAlerts from '@/components/students/InactivityAlerts';
import ActivityChart from '@/components/students/overview/ActivityChart';
import OverviewKpis from '@/components/students/overview/OverviewKpis';
import RecentActivity from '@/components/students/overview/RecentActivity';
import { useNoStudents, useStudentsQuery } from '@/hooks/students/useStudents';
import { useStudentsOverview } from '@/hooks/students/useStudentsOverview';

/**
 * Resumen del entrenador: KPIs, actividad por día y reciente (de `GET /students/overview`) y alertas de inactividad
 * (de `GET /students`). Si falla el resumen, un solo error arriba que no tapa las alertas. La invitación, solo sin
 * ningún alumno.
 */
export default function DashboardPage() {
  const query = useStudentsQuery({ active: true });
  const { none, checking } = useNoStudents(query);
  const overview = useStudentsOverview();
  const now = new Date();
  if (none) return <FirstInvitationCta />;
  if (checking) return <LoadingState />;
  // Un refetch fallido conserva los datos: el error solo reemplaza al resumen si no hay nada que mostrar.
  const failed = overview.isError && overview.data == null;
  return (
    <QueryState query={query} empty={{ title: 'No hay alumnos activos' }}>
      {(students) => (
        <div className="flex flex-col gap-5">
          {failed ? (
            <Card>
              <ErrorState message="No pudimos cargar el resumen." onRetry={() => overview.refetch()} />
            </Card>
          ) : (
            <OverviewKpis overview={overview.data} />
          )}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
            {!failed && (
              <div className="min-w-0">
                <ActivityChart daily={overview.data?.daily} />
              </div>
            )}
            <div className={failed ? 'min-w-0 lg:col-span-2' : 'min-w-0'}>
              <InactivityAlerts students={students} now={now} />
            </div>
          </div>
          {!failed && <RecentActivity recent={overview.data?.recent} />}
        </div>
      )}
    </QueryState>
  );
}
