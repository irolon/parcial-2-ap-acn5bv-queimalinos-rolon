import { List } from 'lucide-react';
import EmptyState from '@/components/shared/states/EmptyState';
import Card from '@/components/shared/ui/Card';

/** Mis rutinas: las rutinas activas del alumno. Versión mínima: la tarea que arma la pantalla la reemplaza. */
export default function MyRoutinesPage() {
  return (
    <Card>
      <EmptyState icon={List} title="Mis rutinas" text="Acá vas a ver las rutinas que te asignó tu entrenador." />
    </Card>
  );
}
