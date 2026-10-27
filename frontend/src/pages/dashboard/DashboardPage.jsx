import LoadingState from '@/components/shared/states/LoadingState';
import QueryState from '@/components/shared/states/QueryState';
import Card from '@/components/shared/ui/Card';
import Stat from '@/components/shared/ui/Stat';
import FirstInvitationCta from '@/components/students/FirstInvitationCta';
import InactivityAlerts from '@/components/students/InactivityAlerts';
import { useNoStudents, useStudentsQuery } from '@/hooks/students/useStudents';
import { INACTIVITY_DAYS, countByStatus } from '@/utils/students/activity';

function Indicators({ students, now }) {
  const { inactive } = countByStatus(students, now);
  const never = students.filter((s) => !s.last_session_at).length;
  return (
    <Card className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <Stat label="Alumnos activos" value={students.length} big />
      <Stat label={`Inactivos > ${INACTIVITY_DAYS} días`} value={inactive} big />
      <Stat label="Nunca entrenaron" value={never} big />
    </Card>
  );
}

/** Resumen del entrenador: indicadores de actividad y alertas de inactividad. La invitación, solo sin ningún alumno. */
export default function DashboardPage() {
  const query = useStudentsQuery({ active: true });
  const { none, checking } = useNoStudents(query);
  const now = new Date();
  if (none) return <FirstInvitationCta />;
  if (checking) return <LoadingState />;
  return (
    <QueryState query={query} empty={{ title: 'No hay alumnos activos' }}>
      {(students) => (
        <div className="flex flex-col gap-5">
          <Indicators students={students} now={now} />
          <InactivityAlerts students={students} now={now} />
        </div>
      )}
    </QueryState>
  );
}
