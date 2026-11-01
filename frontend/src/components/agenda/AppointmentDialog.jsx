import { useState } from 'react';
import Avatar from '@/components/shared/ui/Avatar';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import { useUpdateAppointmentStatus } from '@/hooks/agenda/useAgenda';
import { timeRangeLabel } from '@/utils/agenda';
import { STATUS_STYLES, isPast, shortDayHourLabel, studentName } from './status';

const confirmText = (appt) =>
  `¿Cancelar el turno de ${studentName(appt).split(' ')[0]} del ${shortDayHourLabel(appt.scheduled_at)}? Le avisamos.`;

function Actions({ appt, confirming, pending, onAsk, onBack, onChange }) {
  if (isPast(appt)) return <p className="font-body text-sm text-ink6">Este turno ya pasó</p>;
  if (appt.status === 'cancelled') return null;
  if (confirming) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-body text-sm text-bone0">{confirmText(appt)}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} disabled={pending}>Volver</Button>
          <Button variant="danger" size="sm" loading={pending} onClick={() => onChange('cancelled')}>
            Sí, cancelar turno
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-end gap-3">
      <Button variant="ghost" size="sm" onClick={onAsk}>Cancelar turno</Button>
      {appt.status === 'pending' && (
        <Button size="sm" loading={pending} onClick={() => onChange('confirmed')}>Confirmar</Button>
      )}
    </div>
  );
}

function Body({ appt, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const mutation = useUpdateAppointmentStatus();
  const style = STATUS_STYLES[appt.status];
  const change = (status) => mutation.mutate({ id: appt.id, status }, { onSuccess: onClose });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar name={studentName(appt)} size={40} decorative />
        <div>
          <p className="font-display text-[15px] font-semibold text-bone0">{studentName(appt)}</p>
          <p className="font-mono text-xs text-ink6">{timeRangeLabel(appt.scheduled_at)}</p>
        </div>
      </div>
      <p className={`font-mono text-xs uppercase tracking-wider ${style.text}`}>{style.label}</p>
      {appt.notes && <p className="font-body text-sm text-bone2">{appt.notes}</p>}
      {mutation.isError && <p role="alert" className="font-body text-sm text-hot">{mutation.error.message}</p>}
      <Actions
        appt={appt}
        confirming={confirming}
        pending={mutation.isPending}
        onAsk={() => setConfirming(true)}
        onBack={() => setConfirming(false)}
        onChange={change}
      />
    </div>
  );
}

/** Panel de un turno: datos, Confirmar y Cancelar (con confirmación). Cierra al éxito. */
export default function AppointmentDialog({ appointment, onClose }) {
  return (
    <Dialog open={Boolean(appointment)} onOpenChange={(open) => !open && onClose()} title="Turno">
      {appointment && <Body key={appointment.id} appt={appointment} onClose={onClose} />}
    </Dialog>
  );
}
