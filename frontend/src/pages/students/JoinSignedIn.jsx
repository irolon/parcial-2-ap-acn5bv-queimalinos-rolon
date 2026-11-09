import { useState } from 'react';
import { Link } from 'react-router';
import Button from '@/components/shared/ui/Button';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { homeFor } from '@/routes/routeTable';

/**
 * El link de invitación se abrió con una sesión iniciada (por ejemplo, el PT probando su propio link): no se pierde
 * el token. Para aceptar hay que cerrar la sesión actual; al cerrarla, la página muestra el formulario.
 */
export default function JoinSignedIn({ user }) {
  const logout = useAuthStore((s) => s.logout);
  const [leaving, setLeaving] = useState(false);

  const leave = async () => {
    setLeaving(true);
    await logout();
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-ink3 bg-ink1 p-5">
      <p className="font-body text-sm text-bone0">
        Tenés una sesión abierta como {user.name}. Para aceptar esta invitación, cerrá esa sesión primero.
      </p>
      <Button onClick={leave} loading={leaving} full>
        Cerrar sesión y aceptar la invitación
      </Button>
      <Link to={homeFor(user.role)} className="text-center font-body text-sm text-accentText hover:underline">
        Volver a mi cuenta
      </Link>
    </div>
  );
}
