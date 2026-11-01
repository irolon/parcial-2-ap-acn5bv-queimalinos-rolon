import { User } from 'lucide-react';
import EmptyState from '@/components/shared/states/EmptyState';
import Card from '@/components/shared/ui/Card';

/** Mi perfil: los datos del alumno y sus medidas. Versión mínima: la tarea que arma la pantalla la reemplaza. */
export default function MyProfilePage() {
  return (
    <Card>
      <EmptyState icon={User} title="Mi perfil" text="Acá vas a ver tus datos y cargar tus medidas." />
    </Card>
  );
}
