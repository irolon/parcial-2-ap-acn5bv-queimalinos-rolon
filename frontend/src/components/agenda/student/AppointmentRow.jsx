import { STATUS_STYLES } from '@/components/agenda/status';
import Button from '@/components/shared/ui/Button';
import { nextAppointmentLabel } from '@/utils/agenda/nextAppointment';
import { canCancel } from '@/utils/agenda/studentAgenda';

/**
 * Un turno del alumno: día y hora, estado con su punto, la nota y "Cancelar" si todavía se puede. Los pendientes o
 * confirmados que ya empezaron dicen "Ya pasó"; los cancelados van atenuados. "Ya pasó" mira el reloj en cada render.
 */
export default function AppointmentRow({ appointment, onCancel }) {
  const status = STATUS_STYLES[appointment.status];
  const cancelled = appointment.status === 'cancelled';
  const cancellable = canCancel(appointment, new Date());
  return (
    <li className={`flex items-start justify-between gap-3 py-3 ${cancelled ? 'opacity-60' : ''}`}>
      <div className="min-w-0">
        <p className="font-display text-[15px] font-semibold text-bone0">
          {nextAppointmentLabel(appointment.scheduled_at)}
        </p>
        <p className={`mt-1 flex items-center gap-1.5 font-body text-sm ${status.text}`}>
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status.dot}`} />
          {status.label}
        </p>
        {appointment.notes && (
          <p className="mt-1 line-clamp-2 break-words font-body text-sm text-ink6">{appointment.notes}</p>
        )}
      </div>
      {cancellable && (
        <Button variant="ghost" size="sm" className="shrink-0 max-md:h-11" onClick={() => onCancel(appointment)}>
          Cancelar
        </Button>
      )}
      {!cancelled && !cancellable && <span className="shrink-0 font-mono text-[11px] text-ink6">Ya pasó</span>}
    </li>
  );
}
