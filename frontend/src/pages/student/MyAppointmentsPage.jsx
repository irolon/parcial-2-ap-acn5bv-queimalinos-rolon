import AppointmentList from '@/components/agenda/student/AppointmentList';
import { useAppointments } from '@/hooks/agenda/useAgenda';
import { useToday } from '@/hooks/shared/useToday';
import { nextDaysRange } from '@/utils/agenda/nextAppointment';

/** Días de turnos que se listan: de hoy a hoy + 59 (`GET /appointments` acepta hasta 62). */
const LIST_DAYS = 60;

/** Mis turnos del alumno: sus turnos de hoy a hoy + 59. */
export default function MyAppointmentsPage() {
  const now = useToday();
  const range = nextDaysRange(now, LIST_DAYS);
  const appointments = useAppointments(range.from, range.to);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
      <AppointmentList query={appointments} onCancel={() => {}} />
    </div>
  );
}
