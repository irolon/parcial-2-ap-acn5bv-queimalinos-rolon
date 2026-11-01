import { AlertTriangle } from 'lucide-react';
import Button from '@/components/shared/ui/Button';

/** Aviso chico sobre el historial cuando falla un refetch con datos en pantalla: el composer no se toca. */
export default function RefreshError({ onRetry }) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 border-b border-ink3 bg-ink1 px-4 py-2 font-body text-sm text-ink6"
    >
      <span className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-hot" aria-hidden="true" />
        No pudimos actualizar la conversación.
      </span>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
