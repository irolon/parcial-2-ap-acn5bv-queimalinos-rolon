import { House } from 'lucide-react';
import EmptyState from '@/components/shared/states/EmptyState';
import Card from '@/components/shared/ui/Card';

/** Hoy: la rutina del día y el botón para empezar. Versión mínima: la tarea que arma la pantalla la reemplaza. */
export default function TodayPage() {
  return (
    <Card>
      <EmptyState icon={House} title="Hoy" text="Acá vas a ver la rutina del día y empezar tu entrenamiento." />
    </Card>
  );
}
