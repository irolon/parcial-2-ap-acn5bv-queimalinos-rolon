import Button from '@/components/shared/ui/Button';

/** Aviso del panel (sin conexión, límite, error del asistente o de la carga), con Reintentar si `onRetry`. */
export default function ChatNotice({ text, onRetry }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-ink2 px-4 py-2.5">
      <p className="min-w-0 flex-1 font-body text-[13px] leading-[1.4] text-hot">{text}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
