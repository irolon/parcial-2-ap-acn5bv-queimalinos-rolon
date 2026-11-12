import { WifiOff } from 'lucide-react';
import Button from '@/components/shared/ui/Button';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useSessionRetry } from '@/hooks/auth/useSessionRetry';

/**
 * Pantalla completa del estado `offline`: la sesión sigue guardada pero el servidor no responde.
 * Reintenta sola (`useSessionRetry`); "Cerrar sesión" limpia aunque el backend no conteste y los guards
 * mandan al login.
 */
export default function SessionOffline() {
  const logout = useAuthStore((s) => s.logout);
  const { secondsLeft, retrying, retryNow } = useSessionRetry();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-3 p-6 text-center">
      <WifiOff size={32} className="text-ink6" aria-hidden="true" />
      <h1 className="font-display text-xl font-bold tracking-[-0.4px] text-bone0">Sin conexión con el servidor</h1>
      <p role="status" aria-live="polite" className="max-w-sm font-body text-sm text-ink6">
        Tu sesión sigue guardada. {retrying ? 'Reintentando…' : `Reintentando en ${secondsLeft} s…`}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button onClick={retryNow} loading={retrying}>
          Reintentar ahora
        </Button>
        <Button variant="ghost" onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
