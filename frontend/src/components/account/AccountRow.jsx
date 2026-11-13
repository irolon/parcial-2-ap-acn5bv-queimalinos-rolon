import Button from '@/components/shared/ui/Button';

/** Fila de la tarjeta Cuenta (prototipo `AW_Perfil`): título, subtítulo mono y un botón ghost chico. */
export default function AccountRow({ title, subtitle, actionLabel, onAction, loading = false, children }) {
  return (
    <div className="border-b border-ink2 py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-[13px] font-medium text-bone0">{title}</div>
          <div className="mt-0.5 font-mono text-[10px] text-ink6">{subtitle}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onAction} loading={loading} className="shrink-0">
          {actionLabel}
        </Button>
      </div>
      {children}
    </div>
  );
}
