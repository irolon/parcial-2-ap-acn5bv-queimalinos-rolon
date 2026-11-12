import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import LoadingState from '@/components/shared/states/LoadingState';
import SessionOffline from '@/components/shared/states/SessionOffline';
import { CHANGE_PASSWORD_PATH, homeFor } from './routeTable';

// `idle` = todavía no corrió `restore()`; se trata igual que `loading`.
const isChecking = (status) => status === 'idle' || status === 'loading';
// `offline` = sesión guardada sin verificar (el servidor no responde): ni login ni página, la pantalla de reintento.
// Al volver a `authenticated` se renderiza la ruta pedida: la URL no cambió.

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

/**
 * Rutas privadas: exige sesión y el rol indicado. Con la clave blanqueada (`must_change_password`) manda a
 * `/cambiar-clave` antes de montar la pantalla: el backend contestaría 403 a cualquier pedido.
 */
export function RequireRole({ role }) {
  const { status, user, home } = useSession();
  const location = useLocation();

  if (isChecking(status)) return <SessionLoading />;
  // Offline antes que el flag: sin servidor no se sabe si la clave sigue blanqueada.
  if (status === 'offline') return <SessionOffline />;
  if (!home) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.must_change_password) return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  if (user.role !== role) return <Navigate to={home} replace />;
  return <Outlet />;
}

/** `/cambiar-clave`: necesita sesión y el flag; sin el flag no hay nada que hacer ahí y va a la home del rol. */
export function RequirePasswordChange() {
  const { status, user, home } = useSession();

  if (isChecking(status)) return <SessionLoading />;
  if (status === 'offline') return <SessionOffline />;
  if (!home) return <Navigate to="/login" replace />;
  if (!user.must_change_password) return <Navigate to={home} replace />;
  return <Outlet />;
}

/** `/login`: con sesión iniciada manda a la ruta recordada o a la home del rol. */
export function GuestOnly() {
  const { status, home } = useSession();
  const from = useLocation().state?.from;

  if (isChecking(status)) return <SessionLoading />;
  if (status === 'offline') return <SessionOffline />;
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
  if (status === 'offline') return <SessionOffline />;
  return <Navigate to={home ?? '/login'} replace />;
}
