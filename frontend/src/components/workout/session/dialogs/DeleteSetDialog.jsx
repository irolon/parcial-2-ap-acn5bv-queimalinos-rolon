import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import { kgLabel } from '@/utils/sessions/workoutFormat';

/**
 * Confirmación de borrar una serie ya registrada: "¿Borrar la serie N?". Sin `set`, está cerrado.
 * `onCloseAutoFocus` es el del Dialog: la página lo usa para llevar el foco a Registrar serie cuando la ✕ ya no existe.
 */
export default function DeleteSetDialog({ set, onCancel, onConfirm, onCloseAutoFocus }) {
  return (
    <Dialog
      open={Boolean(set)}
      onOpenChange={(next) => !next && onCancel()}
      onCloseAutoFocus={onCloseAutoFocus}
      title={`¿Borrar la serie ${set?.setNumber}?`}
      description={set ? `${kgLabel(set.kg)} × ${set.reps} reps` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm}>Borrar</Button>
        </>
      }
    />
  );
}
