import Button from '@/components/shared/ui/Button';

const BOX = 'flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 font-body text-sm';

/** Al entrar al formulario con una propuesta guardada: "Verla" (`onShow`) la vuelve a mostrar. */
export function UnfinishedProposal({ onShow }) {
  return (
    <div role="status" className={`${BOX} border-ink3 bg-ink1`}>
      <p className="text-bone0">Tenés una propuesta sin terminar</p>
      <Button variant="ghost" size="sm" onClick={onShow}>Verla</Button>
    </div>
  );
}

/** La ficha del alumno no cargó (red o servidor): el formulario sigue sin la precarga y "Reintentar" la pide de nuevo. */
export function PrefillFailed({ retrying, onRetry }) {
  return (
    <div role="alert" className={`${BOX} border-hot/25 bg-hot/[0.08]`}>
      <p className="text-bone0">No pudimos cargar los datos del alumno.</p>
      <Button variant="ghost" size="sm" loading={retrying} onClick={onRetry}>Reintentar</Button>
    </div>
  );
}
