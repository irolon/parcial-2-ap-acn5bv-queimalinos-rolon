import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getInvitation } from '@/api/invitations/invitations.api';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import BrandMark from '@/components/shared/ui/BrandMark';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import JoinForm from './JoinForm';
import JoinSignedIn from './JoinSignedIn';
import { homeFor } from '@/routes/routeTable';
import { INVALID_LINK, UUID_RE, invitationErrorMessage } from './joinErrors';

function Shell({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink0 p-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark size={44} />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-[-0.6px] text-bone0">FitTrainer</h1>
            <p className="mt-1 font-mono text-[10px] tracking-[1px] text-ink6">
              ACEPTÁ LA INVITACIÓN DE TU PROFE
            </p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

/** `/join?token=<uuid>`: el alumno elige su contraseña y queda con la cuenta creada. */
export default function JoinPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const valid = UUID_RE.test(token);
  const [fatal, setFatal] = useState(null);
  const [joining, setJoining] = useState(false);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const query = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => getInvitation(token),
    // Con una sesión abierta no se pide hasta que se cierre: no gasta el cupo del limitador de la invitación.
    enabled: valid && status === 'anonymous',
    retry: false,
  });

  if (!valid) return <Shell><ErrorState message={INVALID_LINK} /></Shell>;
  // Fuera de GuestOnly a propósito: con una sesión abierta el link no se pierde (B2 de las pruebas web).
  if (status === 'idle' || status === 'loading') return <Shell><LoadingState rows={3} label="Verificando la sesión…" /></Shell>;
  if (status === 'authenticated' && user) {
    return joining ? <Navigate to={homeFor(user.role)} replace /> : <Shell><JoinSignedIn user={user} /></Shell>;
  }
  if (fatal) return <Shell><ErrorState message={fatal} /></Shell>;
  if (query.isPending) return <Shell><LoadingState rows={3} label="Cargando tu invitación…" /></Shell>;
  if (query.isError) {
    const message = invitationErrorMessage(query.error);
    return (
      <Shell>
        <ErrorState
          message={message ?? query.error?.message}
          onRetry={message ? undefined : () => query.refetch()}
        />
      </Shell>
    );
  }
  return (
    <Shell>
      <JoinForm invitation={query.data} token={token} onFatal={setFatal} onJoining={setJoining} />
    </Shell>
  );
}
