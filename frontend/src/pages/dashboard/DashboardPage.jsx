import QueryState from '@/components/shared/states/QueryState';
import Card from '@/components/shared/ui/Card';
import Stat from '@/components/shared/ui/Stat';
import FirstInvitationCta from '@/components/students/FirstInvitationCta';
import InactivityAlerts from '@/components/students/InactivityAlerts';
import { useStudentsQuery } from '@/hooks/students/useStudents';
import { INACTIVITY_DAYS, activityStatus } from '@/utils/students/activity';

function Indicators({ students, now }) {
  const inactive = students.filter((s) => activityStatus(s, now) === 'inactive').length;
  const never = students.filter((s) => !s.last_session_at).length;
  return (
    <Card className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <Stat label="Alumnos activos" value={students.length} big />
      <Stat label={`Inactivos > ${INACTIVITY_DAYS} días`} value={inactive} big />
      <Stat label="Nunca entrenaron" value={never} big />
    </Card>
  );
}

/** Resumen del entrenador: indicadores de actividad y alertas de inactividad. */
export default function DashboardPage() {
  const query = useStudentsQuery({ active: true });
  const now = new Date();
  if (query.isSuccess && query.data.length === 0) return <FirstInvitationCta />;
  return (
    <QueryState query={query}>
      {(students) => (
        <div className="flex flex-col gap-5">
          <Indicators students={students} now={now} />
          <InactivityAlerts students={students} now={now} />
        </div>
      )}
    </QueryState>
  );
}
