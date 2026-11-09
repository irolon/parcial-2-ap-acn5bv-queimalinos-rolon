import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import { sortForStudent } from '@/utils/agenda/studentAgenda';
import AppointmentRow from './AppointmentRow';

function Content({ query, onCancel }) {
  if (query.isError && query.data === undefined) {
    return <ErrorState message="No pudimos cargar tus turnos." onRetry={() => query.refetch()} />;
  }
  if (query.isPending) return <LoadingState rows={3} label="Cargando tus turnos…" />;
  if (query.data.length === 0) {
    return <p className="font-body text-sm text-ink6">No tenés turnos. Pedí uno con tu entrenador.</p>;
  }
  return (
    <ul aria-label="Tus turnos" className="divide-y divide-ink2">
      {sortForStudent(query.data).map((appointment) => (
        <AppointmentRow key={appointment.id} appointment={appointment} onCancel={onCancel} />
      ))}
    </ul>
  );
}

/**
 * "Tus turnos": la lista de `query` (`useAppointments`) con los próximos primero y los cancelados al final.
 * `notice` (el aviso de un turno recién pedido) va arriba, como `role="status"`.
 */
export default function AppointmentList({ query, notice, onCancel }) {
  return (
    <Card title="Tus turnos">
      {notice && (
        <p role="status" className="mb-3 rounded-lg border border-good/40 bg-good/10 px-3 py-2 font-body text-sm text-bone0">
          {notice}
        </p>
      )}
      <Content query={query} onCancel={onCancel} />
    </Card>
  );
}
