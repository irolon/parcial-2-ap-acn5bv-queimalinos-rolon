import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import { useAvailability, useSaveAvailability } from '@/hooks/agenda/useAgenda';
import { validateSlots } from '@/utils/agenda';
import { DAY_NAMES, NEW_SLOT, serverErrors } from './availabilityForm';
import DaySlots from './DaySlots';

const DAYS = DAY_NAMES.map((_, i) => i + 1);

function Form({ initial, save, onClose }) {
  const [slots, setSlots] = useState(initial);
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState(null);

  const edit = (next) => {
    setSlots(next);
    setErrors({});
    setGeneral(null);
  };

  function submit(event) {
    event.preventDefault();
    const found = validateSlots(slots);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setGeneral(found.slots ?? null);
      return;
    }
    save.mutate(slots, {
      onSuccess: onClose,
      onError: (error) => {
        const { byIndex, general: message } = serverErrors(error);
        setErrors(byIndex);
        setGeneral(message);
      },
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      {DAYS.map((weekday) => (
        <DaySlots
          key={weekday}
          weekday={weekday}
          slots={slots.map((slot, index) => ({ slot, index })).filter(({ slot }) => slot.weekday === weekday)}
          errors={errors}
          onAdd={(day) => edit([...slots, { weekday: day, ...NEW_SLOT }])}
          onChange={(index, slot) => edit(slots.map((s, i) => (i === index ? slot : s)))}
          onRemove={(index) => edit(slots.filter((_, i) => i !== index))}
        />
      ))}
      {general && <p role="alert" className="font-body text-sm text-hot">{general}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onClose} disabled={save.isPending}>Cancelar</Button>
        <Button type="submit" loading={save.isPending}>Guardar</Button>
      </div>
    </form>
  );
}

/** Franjas semanales del entrenador: agregar y quitar por día, validar y guardar. */
export default function AvailabilityDialog({ open, onClose }) {
  const availability = useAvailability();
  const save = useSaveAvailability();
  return (
    <Dialog open={open} dismissible={!save.isPending} onOpenChange={(next) => !next && onClose()} title="Disponibilidad">
      {availability.isPending && <LoadingState rows={2} />}
      {availability.isError && <ErrorState onRetry={availability.refetch} />}
      {availability.isSuccess && <Form initial={availability.data} save={save} onClose={onClose} />}
    </Dialog>
  );
}
