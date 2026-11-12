import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import { useUpdateAppointmentStatus } from '@/hooks/agenda/useAgenda';
import { useSubmitLock } from '@/hooks/shared/useSubmitLock';
import { dayAtLabel } from '@/utils/agenda/studentAgenda';

function Body({ appointment, onClose, onRejected }) {
  const update = useUpdateAppointmentStatus();
  const lock = useSubmitLock();
  const [error, setError] = useState(null);

  const confirm = () =>
    lock(async () => {
      setError(null);
      try {
        await update.mutateAsync({ id: appointment.id, status: 'cancelled' });
        onClose();
      } catch (err) {
        setError(err.message);
        onRejected();
      }
    });

  return (
    <Dialog
      open
      dismissible={!update.isPending}
      onOpenChange={(next) => !next && onClose()}
      title="Cancelar turno"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={update.isPending}>Volver</Button>
          <Button variant="danger" loading={update.isPending} onClick={confirm}>Sí, cancelar</Button>
        </>
      }
    >
      <p className="font-body text-sm text-bone0">¿Cancelar el turno del {dayAtLabel(appointment.scheduled_at)}?</p>
      {error && <p role="alert" className="mt-3 font-body text-sm text-hot">{error}</p>}
    </Dialog>
  );
}

/**
 * Confirmación para cancelar `appointment` (cerrado si es `null`). Mientras va el pedido no se cierra. Si el servidor
 * lo rechaza, muestra su texto y llama a `onRejected` (la página vuelve a pedir los turnos).
 */
export default function CancelAppointmentDialog({ appointment, onClose, onRejected }) {
  if (!appointment) return null;
  return <Body key={appointment.id} appointment={appointment} onClose={onClose} onRejected={onRejected} />;
}
