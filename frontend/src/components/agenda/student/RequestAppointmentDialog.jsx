import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import Textarea from '@/components/shared/ui/Textarea';
import { useCreateAppointment } from '@/hooks/agenda/useAgenda';
import { useSubmitLock } from '@/hooks/shared/useSubmitLock';
import { nextAppointmentLabel } from '@/utils/agenda/nextAppointment';

/** Largo máximo de la nota (el mismo que valida el backend). */
const NOTES_MAX = 500;

function Body({ startsAt, onClose, onCreated, onRejected }) {
  const create = useCreateAppointment();
  const lock = useSubmitLock();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    lock(async () => {
      setError(null);
      // `scheduled_at` es el `starts_at` que dio el servidor, tal cual; la nota vacía no se manda.
      const body = { scheduled_at: startsAt };
      if (notes.trim()) body.notes = notes.trim();
      try {
        await create.mutateAsync(body);
        onCreated();
        onClose();
      } catch (err) {
        setError(err.message);
        onRejected();
      }
    });
  };

  return (
    <Dialog open dismissible={!create.isPending} onOpenChange={(next) => !next && onClose()} title="Pedir turno">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="font-display text-2xl font-semibold text-bone0">{nextAppointmentLabel(startsAt)}</p>
        <Textarea
          label="Nota (opcional)"
          maxLength={NOTES_MAX}
          value={notes}
          hint={`${notes.length}/${NOTES_MAX}`}
          onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
        />
        {error && <p role="alert" className="font-body text-sm text-hot">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>Volver</Button>
          <Button type="submit" loading={create.isPending}>Pedir turno</Button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * Pide el turno de `startsAt` (cerrado si es `null`) con una nota opcional. Al salir bien llama a `onCreated` y se
 * cierra; si el servidor lo rechaza muestra su texto, queda abierto y llama a `onRejected` (la página vuelve a pedir
 * libres y turnos).
 */
export default function RequestAppointmentDialog({ startsAt, onClose, onCreated, onRejected }) {
  if (!startsAt) return null;
  return <Body key={startsAt} startsAt={startsAt} onClose={onClose} onCreated={onCreated} onRejected={onRejected} />;
}
