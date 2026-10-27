import { Link, useSearchParams } from 'react-router';
import { SearchX } from 'lucide-react';
import EmptyState from '@/components/shared/states/EmptyState';
import QueryState from '@/components/shared/states/QueryState';
import Button from '@/components/shared/ui/Button';
import FirstInvitationCta from '@/components/students/FirstInvitationCta';
import StudentCard from '@/components/students/StudentCard';
import StudentFilters from '@/components/students/StudentFilters';
import StudentsGridSkeleton from '@/components/students/StudentsGridSkeleton';
import { usePageHeader } from '@/hooks/shared/usePageHeader';
import { useNoStudents, useStudentsQuery } from '@/hooks/students/useStudents';
import { NEW_STUDENT } from '@/routes/routeTable';
import { countByStatus } from '@/utils/students/activity';
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
  return `${students.length} ACTIVOS · ${countByStatus(students, now).inactive} INACTIVOS`;
}

/** Panel de alumnos: grilla con estado de actividad y filtros guardados en la URL. */
export default function StudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseStudentFilters(searchParams);
  const disabledView = filters.estado === 'baja';
  const query = useStudentsQuery({ active: !disabledView });
  const { none, checking } = useNoStudents(disabledView ? null : query);
  const now = new Date();
  usePageHeader({ title: 'Alumnos', subtitle: subtitleFor(query.data, filters.estado, now) });

  const update = (next) => setSearchParams(filtersToSearch(next), { replace: true });
  if (none) return <FirstInvitationCta />;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Link
          to={NEW_STUDENT.path}
          className="inline-flex h-11 items-center rounded-lg bg-accent px-[18px] font-display text-sm font-semibold text-accentInk hover:bg-accentDim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText"
        >
          Nuevo alumno
        </Link>
      </div>
      <StudentFilters filters={filters} onChange={update} />
      {checking ? (
        <StudentsGridSkeleton />
      ) : (
        <QueryState
          query={query}
          loading={<StudentsGridSkeleton />}
          empty={{ title: disabledView ? 'No hay alumnos dados de baja' : 'No hay alumnos activos' }}
        >
          {(students) => {
            const items = sortStudents(filterStudents(students, filters, now), filters.orden, now);
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
      )}
    </section>
  );
}
