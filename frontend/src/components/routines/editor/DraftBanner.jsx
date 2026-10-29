import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';

/** "Recuperamos tu borrador" con "Descartar" (pide confirmación). `missing`: ejercicios que ya no existen. */
export default function DraftBanner({ missing = 0, onDiscard }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink3 bg-ink1 px-4 py-3 font-body text-sm">
      <div>
        <p className="text-bone0">Recuperamos tu borrador</p>
        {missing > 0 && (
          <p className="text-ink6">
            Quitamos {missing} {missing === 1 ? 'ejercicio que ya no existe' : 'ejercicios que ya no existen'} en la biblioteca.
          </p>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>Descartar</Button>
      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Descartar borrador"
        description="Se borra lo que armaste hasta ahora. No se puede deshacer."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
            <Button variant="danger" onClick={onDiscard}>Sí, descartar</Button>
          </>
        }
      />
    </div>
  );
}
