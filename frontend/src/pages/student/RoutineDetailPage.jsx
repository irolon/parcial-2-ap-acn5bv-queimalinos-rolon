import { List } from 'lucide-react';
import EmptyState from '@/components/shared/states/EmptyState';
import Card from '@/components/shared/ui/Card';

/** Detalle de una rutina del alumno (`/alumno/rutinas/:id`). Versión mínima: la tarea que arma la pantalla la reemplaza. */
export default function RoutineDetailPage() {
  return (
    <Card>
      <EmptyState icon={List} title="Detalle de la rutina" text="Acá vas a ver los ejercicios de la rutina, uno por uno." />
    </Card>
  );
}
