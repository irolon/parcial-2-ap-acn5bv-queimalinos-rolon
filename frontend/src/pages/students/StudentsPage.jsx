import { useSearchParams } from 'react-router';
import { SearchX } from 'lucide-react';
import EmptyState from '@/components/shared/states/EmptyState';
import QueryState from '@/components/shared/states/QueryState';
import Button from '@/components/shared/ui/Button';
import FirstInvitationCta from '@/components/students/FirstInvitationCta';
import StudentCard from '@/components/students/StudentCard';
import StudentFilters from '@/components/students/StudentFilters';
import StudentsGridSkeleton from '@/components/students/StudentsGridSkeleton';
import { usePageHeader } from '@/hooks/shared/usePageHeader';
import { useStudentsQuery } from '@/hooks/students/useStudents';
import { activityStatus } from '@/utils/students/activity';
import {
  DEFAULT_FILTERS,
  filterStudents,
  filtersToSearch,
  parseStudentFilters,
  sortStudents,
} from '@/utils/students/studentFilters';

function subtitleFor(students, estado, now) {
  if (!students) return undefined;
  if (estado === 'baja') return `${students.length} DADOS DE BAJA`;
  const inactive = students.filter((s) => activityStatus(s, now) === 'inactive').length;
  return `${students.length} ACTIVOS · ${inactive} INACTIVOS`;
}

/** Panel de alumnos: grilla con estado de actividad y filtros guardados en la URL. */
export default function StudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseStudentFilters(searchParams);
  const query = useStudentsQuery({ active: filters.estado !== 'baja' });
  const now = new Date();
  usePageHeader({ title: 'Alumnos', subtitle: subtitleFor(query.data, filters.estado, now) });

  const update = (next) => setSearchParams(filtersToSearch(next), { replace: true });
  if (query.isSuccess && query.data.length === 0 && filters.estado !== 'baja') return <FirstInvitationCta />;

  return (
    <section className="flex flex-col gap-5">
      <StudentFilters filters={filters} onChange={update} />
      <QueryState
        query={query}
        loading={<StudentsGridSkeleton />}
        empty={{ title: 'No hay alumnos dados de baja' }}
      >
        {(students) => {
          const items = sortStudents(filterStudents(students, filters, now), filters.orden);
          if (items.length === 0) {
            return (
              <div className="flex flex-col items-center">
                <EmptyState icon={SearchX} title="Ningún alumno coincide" />
                <Button variant="ghost" onClick={() => update(DEFAULT_FILTERS)}>
                  Limpiar filtros
                </Button>
              </div>
            );
          }
          return (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((s) => (
                <StudentCard key={s.id} student={s} now={now} search={searchParams.toString()} />
              ))}
            </ul>
          );
        }}
      </QueryState>
    </section>
  );
}
