import { useId } from 'react';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import { MAX_PENDING, dayAtLabel, groupFreeSlots } from '@/utils/agenda/studentAgenda';

const LIMIT = `Ya tenés ${MAX_PENDING} turnos pendientes: esperá a que tu entrenador los confirme.`;

function Days({ slots, disabled, limitId, onPick }) {
  const days = groupFreeSlots(slots);
  if (days.length === 0) {
    return (
      <p className="font-body text-sm text-ink6">Tu entrenador no tiene horarios libres en las próximas 4 semanas.</p>
    );
  }
  return (
    <ul className="flex flex-col gap-3.5">
      {days.map((day) => (
        <li key={day.date}>
          <p className="mb-1.5 font-mono text-[11px] tracking-[1px] text-ink6">{day.label}</p>
          <div className="flex flex-wrap gap-2">
            {day.slots.map((slot) => (
              <Button
                key={slot.starts_at}
                variant="ghost"
                size="sm"
                className="min-h-11 min-w-16"
                disabled={disabled}
                aria-describedby={disabled ? limitId : undefined}
                aria-label={`Pedir turno el ${dayAtLabel(slot.starts_at)}`}
                onClick={() => onPick(slot.starts_at)}
              >
                {slot.time}
              </Button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * "Pedir turno": los horarios libres de `query` (`useFreeSlots`) agrupados por día, como chips. Con `limitReached`
 * (3 pendientes a futuro) los chips se deshabilitan con el motivo. `onPick(starts_at)` abre el pedido.
 */
export default function FreeSlotsCard({ query, limitReached, onPick }) {
  const limitId = useId();
  let content;
  if (query.isError && query.data === undefined) {
    content = <ErrorState message="No pudimos cargar los horarios libres." onRetry={() => query.refetch()} />;
  } else if (query.isPending) {
    content = <LoadingState rows={3} label="Cargando los horarios libres…" />;
  } else {
    content = <Days slots={query.data} disabled={limitReached} limitId={limitId} onPick={onPick} />;
  }
  return (
    <Card title="Pedir turno">
      <p className="-mt-2 mb-3.5 font-body text-sm text-ink6">Podés tener hasta {MAX_PENDING} turnos pendientes.</p>
      {limitReached && (
        <p id={limitId} className="mb-3.5 font-body text-sm text-warn">{LIMIT}</p>
      )}
      {content}
    </Card>
  );
}
