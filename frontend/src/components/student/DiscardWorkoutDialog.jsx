import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';

/** Confirmación de descartar el entrenamiento en curso: se pierden las series registradas. */
export default function DiscardWorkoutDialog({ open, onCancel, onConfirm }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && onCancel()}
      title="¿Descartar el entrenamiento en curso?"
      description="Se pierden las series registradas"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm}>Sí, descartar</Button>
        </>
      }
    />
  );
}
