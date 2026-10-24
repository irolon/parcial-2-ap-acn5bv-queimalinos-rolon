import { Link } from 'react-router';
import { User } from 'lucide-react';
import EmptyState from '@/components/shared/states/EmptyState';
import Card from '@/components/shared/ui/Card';

/** Vacío de "todavía no tenés alumnos" con el link a la primera invitación. */
export default function FirstInvitationCta() {
  return (
    <Card>
      <EmptyState
        icon={User}
        title="Todavía no tenés alumnos"
        text="Invitá a tu primer alumno para empezar a seguir su actividad."
      />
      <div className="flex justify-center pb-6">
        <Link
          to="/pt/alumnos/nuevo"
          className="inline-flex h-11 items-center rounded-lg bg-accent px-[18px] font-display text-sm font-semibold text-accentInk hover:bg-accentDim"
        >
          Generá tu primera invitación
        </Link>
      </div>
    </Card>
  );
}
