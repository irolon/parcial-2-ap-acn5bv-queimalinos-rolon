import NextAppointmentCard from '@/components/student/today/NextAppointmentCard';
import TrainerNoteCard from '@/components/student/today/TrainerNoteCard';
import WeekSection from '@/components/student/today/WeekSection';

/** La columna de contexto de Hoy: la semana, la nota del entrenador/a y el próximo turno, en ese orden. */
export default function TodayContext({ now }) {
  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      <WeekSection now={now} />
      <TrainerNoteCard />
      <NextAppointmentCard now={now} />
    </div>
  );
}
