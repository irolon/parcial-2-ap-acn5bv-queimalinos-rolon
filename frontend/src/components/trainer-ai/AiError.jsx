import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router';
import Button from '@/components/shared/ui/Button';
import { useCountdown } from '@/hooks/trainer-ai/useCountdown';
import { GHOST_LINK } from './links';

function Retry({ wait, onRetry }) {
  const left = useCountdown(wait);
  return (
    <>
      {left > 0 && <p className="font-mono text-xs text-ink6">{`Podés reintentar en ${left} s`}</p>}
      <Button onClick={onRetry} disabled={left > 0}>Reintentar</Button>
    </>
  );
}

/**
 * Error al generar, siempre con salida: "Reintentar" (en un 429, recién al terminar la cuenta atrás de `Retry-After`)
 * y "Armar a mano" (`manualHref`). `error` es el de `aiErrorOf`.
 */
export default function AiError({ error, manualHref, onRetry }) {
  return (
    <div role="alert" className="flex max-w-3xl flex-col items-center gap-4 rounded-xl border border-ink2 bg-ink1 px-6 py-10 text-center">
      <AlertTriangle size={28} className="text-hot" aria-hidden="true" />
      <p className="max-w-md font-body text-sm text-bone0">{error.message}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Retry wait={error.kind === 'rate' ? error.retryAfter : 0} onRetry={onRetry} />
        <Link to={manualHref} className={GHOST_LINK}>Armar a mano</Link>
      </div>
    </div>
  );
}
