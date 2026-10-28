import Button from '@/components/shared/ui/Button';

/** Aviso de página cuando falla la biblioteca: sin ella no se puede armar ni restaurar la rutina. */
export default function LibraryErrorAlert({ onRetry }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hot px-4 py-3 font-body text-sm text-bone0">
      <p>No pudimos cargar la biblioteca de ejercicios. Reintentá para seguir armando la rutina.</p>
      <Button variant="ghost" size="sm" onClick={onRetry}>Reintentar</Button>
    </div>
  );
}
