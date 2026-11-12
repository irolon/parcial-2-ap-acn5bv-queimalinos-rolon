import { Calendar } from 'lucide-react';
import { Link } from 'react-router';
import { STATUS_STYLES } from '@/components/agenda/status';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import { useAppointments } from '@/hooks/agenda/useAgenda';
import { MY_APPOINTMENTS_PATH } from '@/routes/routeTable';
import { nextAppointment, nextAppointmentLabel, nextDaysRange } from '@/utils/agenda/nextAppointment';

const RANGE_DAYS = 14;

// Mismo aspecto que `Button variant="ghost" full` (es un link, no un botón).
const LINK_CLASSES = [
  'mt-3.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/[0.14]',
  'bg-transparent px-[18px] font-display text-sm font-semibold text-bone0 transition-colors hover:bg-white/[0.06]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText',
].join(' ');

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
 * la pantalla). "Ver agenda" lleva a Mis turnos en todos los estados salvo mientras carga.
 */
export default function NextAppointmentCard({ now }) {
  const { from, to } = nextDaysRange(now, RANGE_DAYS);
  const appointments = useAppointments(from, to);

  let content;
  let loading = false;
  if (appointments.isError && appointments.data === undefined) {
    content = <ErrorState message="No pudimos cargar tus turnos." onRetry={() => appointments.refetch()} />;
  } else if (appointments.isPending) {
    loading = true;
    content = <LoadingState rows={1} label="Cargando tus turnos…" />;
  } else {
    // "Ahora" es el reloj, no `now`: `now` queda fijo todo el día y dejaría ver un turno que ya pasó.
    content = <Content appointment={nextAppointment(appointments.data, new Date())} />;
  }
  return (
    <Card title="Próximo turno">
      {content}
      {!loading && (
        <Link to={MY_APPOINTMENTS_PATH} className={LINK_CLASSES}>
          <Calendar size={16} aria-hidden="true" />
          Ver agenda
        </Link>
      )}
    </Card>
  );
}
