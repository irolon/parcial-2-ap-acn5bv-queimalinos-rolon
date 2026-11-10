import { useEffect, useState } from 'react';
import AppointmentList from '@/components/agenda/student/AppointmentList';
import CancelAppointmentDialog from '@/components/agenda/student/CancelAppointmentDialog';
import FreeSlotsCard from '@/components/agenda/student/FreeSlotsCard';
import RequestAppointmentDialog from '@/components/agenda/student/RequestAppointmentDialog';
import { useAgendaClock } from '@/hooks/agenda/useAgendaClock';
import { useAppointments, useFreeSlots } from '@/hooks/agenda/useAgenda';
import { useToday } from '@/hooks/shared/useToday';
import { nextDaysRange } from '@/utils/agenda/nextAppointment';
import { MAX_PENDING, NOTICE_MS, pendingAhead } from '@/utils/agenda/studentAgenda';

/** Días de turnos que se listan: de hoy a hoy + 59 (`GET /appointments` acepta hasta 62). */
const LIST_DAYS = 60;
/** Días de horarios libres: de hoy a hoy + 27 (el backend le corta al alumno en ahora + 28 días). */
const FREE_DAYS = 28;

const NOTICE = 'Turno pedido: tu entrenador lo tiene que confirmar.';

/**
 * Mis turnos del alumno: sus turnos de hoy a hoy + 59 (con cancelar) y los horarios libres de su entrenador para
 * pedir uno. El aviso de "turno pedido" vive en la página: se va a los `NOTICE_MS`, al abrir otro diálogo o al salir.
 * "Ya pasó", "Cancelar" y el límite de pendientes siguen al reloj (`useAgendaClock`), sin recargar.
 */
export default function MyAppointmentsPage() {
  const now = useToday();
  const list = nextDaysRange(now, LIST_DAYS);
  const range = nextDaysRange(now, FREE_DAYS);
  const appointments = useAppointments(list.from, list.to);
  const free = useFreeSlots(range.from, range.to);
  const [toCancel, setToCancel] = useState(null);
  const [toRequest, setToRequest] = useState(null);
  const [notice, setNotice] = useState(null);
  // El reloj y no `now`: `now` queda fijo todo el día.
  const clock = useAgendaClock(appointments.data);
  const limitReached = pendingAhead(appointments.data, clock) >= MAX_PENDING;

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const openCancel = (appointment) => {
    setNotice(null);
    setToCancel(appointment);
  };
  const openRequest = (startsAt) => {
    setNotice(null);
    setToRequest(startsAt);
  };

  const refetchAll = () => Promise.all([free.refetch(), appointments.refetch()]);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
      <AppointmentList query={appointments} notice={notice} now={clock} onCancel={openCancel} />
      <FreeSlotsCard query={free} limitReached={limitReached} onPick={openRequest} />
      <CancelAppointmentDialog
        appointment={toCancel}
        onClose={() => setToCancel(null)}
        onRejected={() => appointments.refetch()}
      />
      <RequestAppointmentDialog
        startsAt={toRequest}
        onClose={() => setToRequest(null)}
        onCreated={() => setNotice(NOTICE)}
        onRejected={refetchAll}
      />
    </div>
  );
}
