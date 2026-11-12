import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import { useToday } from '@/hooks/shared/useToday';
import { useAttendanceQuery } from '@/hooks/students/useAttendance';
import { useStudentQuery } from '@/hooks/students/useStudents';
import { attendanceTitle, canGoNext, canGoPrev, firstMonth, isoDay, shiftMonth } from '@/utils/students/attendanceCalendar';
import { currentMonth } from '@/utils/students/commitment';
import AttendanceGrid from './AttendanceGrid';

const ARROW =
  'flex size-8 items-center justify-center rounded-md text-bone0 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-30 ' +
  'focus-visible:outline-2 focus-visible:outline-accentText';

function Arrow({ label, icon: Icon, disabled, onClick }) {
  return (
    <button type="button" aria-label={label} className={ARROW} disabled={disabled} onClick={onClick}>
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

function Count({ data }) {
  if (!data) return null;
  const strong = <strong className="font-display text-sm font-semibold text-bone0">{data.sessions}</strong>;
  if (!data.assigned_days) {
    return <p className="font-mono text-[11px] text-ink6">{strong} {data.sessions === 1 ? 'SESIÓN' : 'SESIONES'}</p>;
  }
  return <p className="font-mono text-[11px] text-ink6">{strong} DE {data.assigned_days}</p>;
}

/**
 * Calendario de asistencia de un mes, con flechas entre el mes del alta (`created_at` del alumno, la misma caché que
 * la ficha) y el actual (hora argentina). El mes no va a la URL; al cambiarlo queda el anterior atenuado hasta que
 * llega el nuevo. El mes actual comparte caché con los indicadores del mes.
 */
export default function AttendanceCard({ studentId }) {
  const today = useToday();
  const current = currentMonth(today);
  const student = useStudentQuery(studentId);
  const floor = firstMonth(student.data?.created_at, current);
  const [picked, setPicked] = useState(null);
  const wanted = picked ?? current;
  const month = wanted > current ? current : wanted < floor ? floor : wanted;
  const query = useAttendanceQuery(studentId, month, { keepPrevious: true });

  const extra = (
    <div className="flex items-center gap-3">
      <div className="flex items-center">
        <Arrow label="Mes anterior" icon={ChevronLeft} disabled={!canGoPrev(month, floor)} onClick={() => setPicked(shiftMonth(month, -1))} />
        <Arrow label="Mes siguiente" icon={ChevronRight} disabled={!canGoNext(month, current)} onClick={() => setPicked(shiftMonth(month, 1))} />
      </div>
      {!query.isError && <Count data={query.data} />}
    </div>
  );

  return (
    <Card title={attendanceTitle(month, current)} extra={extra} className="min-w-0">
      {query.isError && <ErrorState message="No pudimos cargar la asistencia." onRetry={() => query.refetch()} />}
      {query.isPending && <LoadingState rows={3} label="Cargando la asistencia…" />}
      {query.isSuccess && (
        <AttendanceGrid month={query.data.month ?? month} days={query.data.days ?? []} today={isoDay(today)} dimmed={query.isPlaceholderData} />
      )}
    </Card>
  );
}
