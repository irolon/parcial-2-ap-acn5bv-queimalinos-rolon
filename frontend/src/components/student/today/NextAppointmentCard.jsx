import { STATUS_STYLES } from '@/components/agenda/status';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import { useAppointments } from '@/hooks/agenda/useAgenda';
import { nextAppointment, nextAppointmentLabel, nextDaysRange } from '@/utils/agenda/nextAppointment';

const RANGE_DAYS = 14;

function Content({ appointment }) {
  if (!appointment) {
    return <p className="font-body text-sm text-ink6">No tenés turnos en los próximos {RANGE_DAYS} días.</p>;
  }
  const status = STATUS_STYLES[appointment.status];
  return (
    <>
      <p className="font-display text-xl font-semibold text-bone0">{nextAppointmentLabel(appointment.scheduled_at)}</p>
      <p className={`mt-1.5 flex items-center gap-1.5 font-body text-sm ${status.text}`}>
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status.dot}`} />
        {status.label}
      </p>
    </>
  );
}

/**
 * "Próximo turno": el primero pendiente o confirmado de hoy a hoy + 13 (fecha argentina, a partir de `now`, el día de
 * la pantalla). Sin botón: la web del alumno todavía no tiene pantalla de turnos.
 */
export default function NextAppointmentCard({ now }) {
  const { from, to } = nextDaysRange(now, RANGE_DAYS);
  const appointments = useAppointments(from, to);

  let content;
  if (appointments.isError && appointments.data === undefined) {
    content = <ErrorState message="No pudimos cargar tus turnos." onRetry={() => appointments.refetch()} />;
  } else if (appointments.isPending) {
    content = <LoadingState rows={1} label="Cargando tus turnos…" />;
  } else {
    // "Ahora" es el reloj, no `now`: `now` queda fijo todo el día y dejaría ver un turno que ya pasó.
    content = <Content appointment={nextAppointment(appointments.data, new Date())} />;
  }
  return <Card title="Próximo turno">{content}</Card>;
}
