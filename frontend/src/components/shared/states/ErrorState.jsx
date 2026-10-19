import { AlertTriangle } from 'lucide-react';
import Button from '@/components/shared/ui/Button';

export default function ErrorState({ message = 'No pudimos cargar la información.', onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <AlertTriangle size={28} className="text-hot" aria-hidden="true" />
      <p className="font-display text-[15px] font-semibold text-bone0">Algo salió mal</p>
      <p className="max-w-sm font-body text-sm text-ink6">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
