import { Dumbbell } from 'lucide-react';
import EmptyState from '@/components/shared/states/EmptyState';
import Card from '@/components/shared/ui/Card';

/** Sesión activa (`/alumno/entrenar`). Versión mínima: la tarea que arma la pantalla la reemplaza. */
export default function WorkoutPage() {
  return (
    <Card>
      <EmptyState icon={Dumbbell} title="Entrenamiento" text="Acá vas a registrar tus series mientras entrenás." />
    </Card>
  );
}
