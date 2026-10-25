import { useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { UserX } from 'lucide-react';
import AnthropometryCard from '@/components/body-metrics/AnthropometryCard';
import MetricsHistory from '@/components/body-metrics/MetricsHistory';
import WeightChart from '@/components/body-metrics/WeightChart';
import EmptyState from '@/components/shared/states/EmptyState';
import ErrorState from '@/components/shared/states/ErrorState';
import QueryState from '@/components/shared/states/QueryState';
import Button from '@/components/shared/ui/Button';
import StudentDialogs from '@/components/students/dialogs/StudentDialogs';
import ActiveRoutineCard from '@/components/students/profile/ActiveRoutineCard';
import AiContextCard from '@/components/students/profile/AiContextCard';
import ProfileActions from '@/components/students/profile/ProfileActions';
import ProfileHeader from '@/components/students/profile/ProfileHeader';
import StudentNavigation from '@/components/students/profile/StudentNavigation';
import { useMetricsQuery } from '@/hooks/body-metrics/useBodyMetrics';
import { usePageHeader } from '@/hooks/shared/usePageHeader';
import { useStudentQuery, useStudentsQuery } from '@/hooks/students/useStudents';
import { latestTwo } from '@/utils/body-metrics/metrics';
import { lastSessionLabel } from '@/utils/students/activity';
import { filterStudents, parseStudentFilters, sortStudents } from '@/utils/students/studentFilters';

function NotFound() {
  return (
    <div className="flex flex-col items-center">
      <EmptyState icon={UserX} title="No encontramos a este alumno" />
      <Link to="/pt/alumnos" className="font-display text-sm font-semibold text-accentText hover:underline">
        Volver a alumnos
      </Link>
    </div>
  );
}

const subtitleFor = (student, now) =>
  `ALUMNOS › PERFIL · ${
    student.last_session_at ? `ÚLTIMA SESIÓN ${lastSessionLabel(student, now).toUpperCase()}` : 'NUNCA ENTRENÓ'
  }`;

/** Ficha del alumno: datos, medidas, contexto para la IA y navegación por la lista del panel. */
export default function StudentProfilePage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  const now = useMemo(() => new Date(), []);
  const query = useStudentQuery(id);
  const estado = parseStudentFilters(searchParams).estado;
  const listQuery = useStudentsQuery({ active: estado !== 'baja' });
  const metricsQuery = useMetricsQuery(id);
  const [dialog, setDialog] = useState(null);
  const dialogSeq = useRef(0);
  const open = (type, extra) => setDialog({ id: (dialogSeq.current += 1), type, ...extra });
  const close = () => setDialog(null);

  const student = query.data;
  usePageHeader(student ? { title: student.name, subtitle: subtitleFor(student, now) } : null);

  const students = useMemo(() => {
    const filters = parseStudentFilters(new URLSearchParams(search));
    return sortStudents(filterStudents(listQuery.data ?? [], filters, now), filters.orden);
  }, [listQuery.data, search, now]);

  if (query.error?.status === 403) return <NotFound />;
  const metrics = metricsQuery.data ?? [];

  return (
    <QueryState query={query}>
      {(data) => (
        <div className="flex min-w-0 flex-col gap-5">
          <StudentNavigation students={students} id={id} search={search} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-5">
              <ProfileHeader student={data} now={now} />
              <ProfileActions student={data} onEdit={() => open('edit')} onDeactivate={() => open('deactivate')} />
              <AnthropometryCard
                latest={data.latest_metrics}
                previous={latestTwo(metrics).previous}
                extra={
                  <Button variant="ghost" size="sm" onClick={() => open('metric')}>
                    Cargar medida
                  </Button>
                }
              />
              <AiContextCard
                student={data}
                extra={
                  <Button variant="ghost" size="sm" onClick={() => open('context')}>
                    Editar
                  </Button>
                }
              />
            </div>
            <div className="flex min-w-0 flex-col gap-5">
              {metricsQuery.isError ? (
                <ErrorState message={metricsQuery.error?.message} onRetry={() => metricsQuery.refetch()} />
              ) : (
                <>
                  <WeightChart metrics={metrics} />
                  <MetricsHistory metrics={metrics} onDelete={(metric) => open('deleteMetric', { metric })} />
                </>
              )}
              <ActiveRoutineCard routine={data.active_routine} />
            </div>
          </div>
          <StudentDialogs dialog={dialog} student={data} onClose={close} />
        </div>
      )}
    </QueryState>
  );
}
