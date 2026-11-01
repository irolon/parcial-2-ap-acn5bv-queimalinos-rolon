import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import Dialog from '@/components/shared/ui/Dialog';

/**
 * La subida del entrenamiento terminado:
 * - subiendo: "Guardando tu entrenamiento…", sin botones (no se descarta lo que está en camino);
 * - error que se puede reintentar (sin red, 5xx…): "No pudimos guardar tu entrenamiento. Tus series siguen guardadas
 *   en este navegador." y Reintentar. Solo eso: descartar podría dejar una sesión a medias en el servidor;
 * - error que reintentar no arregla (`retryable === false`, p. ej. un 409): el mensaje del servidor, "No se pudo guardar
 *   este entrenamiento." y Descartar entrenamiento (con confirmación), para que el alumno no quede trabado.
 */
export default function SavingScreen({ saving, error, onRetry, onDiscard }) {
  const [confirming, setConfirming] = useState(false);
  if (saving) {
    return (
      <Card padding={32} className="mx-auto w-full max-w-xl">
        <div role="status" className="flex flex-col items-center gap-3 text-center">
          <Loader2 size={28} className="animate-spin text-accentText" aria-hidden="true" />
          <p className="font-display text-lg font-semibold text-bone0">Guardando tu entrenamiento…</p>
        </div>
      </Card>
    );
  }
  const rejected = error?.retryable === false;
  return (
    <Card padding={32} className="mx-auto w-full max-w-xl">
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertTriangle size={28} className="text-hot" aria-hidden="true" />
        <div role="alert" className="flex flex-col gap-1 font-body text-sm text-bone0">
          {rejected ? (
            <>
              <p>{error.message}</p>
              <p className="text-ink6">No se pudo guardar este entrenamiento.</p>
            </>
          ) : (
            <p>No pudimos guardar tu entrenamiento. Tus series siguen guardadas en este navegador.</p>
          )}
        </div>
        {rejected ? (
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            Descartar entrenamiento
          </Button>
        ) : (
          <Button variant="ghost" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </div>
      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Descartar el entrenamiento? No se va a guardar."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirming(false);
                onDiscard();
              }}
            >
              Descartar
            </Button>
          </>
        }
      />
    </Card>
  );
}
