import { Calendar } from 'lucide-react';
import EmptyState from '@/components/shared/states/EmptyState';
import Card from '@/components/shared/ui/Card';

/** Historial de entrenamientos del alumno. Versión mínima: la tarea que arma la pantalla la reemplaza. */
export default function HistoryPage() {
  return (
    <Card>
      <EmptyState icon={Calendar} title="Historial" text="Acá vas a ver los entrenamientos que ya hiciste." />
    </Card>
  );
}
