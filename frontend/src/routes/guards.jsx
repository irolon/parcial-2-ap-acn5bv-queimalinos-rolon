import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import LoadingState from '@/components/shared/states/LoadingState';
import { homeFor } from './routeTable';

// `idle` = todavía no corrió `restore()`; se trata igual que `loading`.
const isChecking = (status) => status === 'idle' || status === 'loading';

function useSession() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const home = status === 'authenticated' ? homeFor(user?.role) : null;
  return { status, user, home };
}

/** Skeleton de pantalla completa mientras se verifica la sesión. */
export function SessionLoading() {
  return (
    <div className="mx-auto min-h-screen max-w-3xl p-6">
      <LoadingState rows={4} label="Verificando la sesión…" />
    </div>
  );
}

/** Rutas privadas: exige sesión y el rol indicado. */
export function RequireRole({ role }) {
  const { status, user, home } = useSession();
  const location = useLocation();

  if (isChecking(status)) return <SessionLoading />;
  if (!home) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== role) return <Navigate to={home} replace />;
  return <Outlet />;
}

/** `/login`: con sesión iniciada manda a la ruta recordada o a la home del rol. */
export function GuestOnly() {
  const { status, home } = useSession();
  const from = useLocation().state?.from;

  if (isChecking(status)) return <SessionLoading />;
  if (home) {
    const target = from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : home;
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}

/** `/`: home del rol o login. */
export function RootRedirect() {
  const { status, home } = useSession();
  if (isChecking(status)) return <SessionLoading />;
  return <Navigate to={home ?? '/login'} replace />;
}
