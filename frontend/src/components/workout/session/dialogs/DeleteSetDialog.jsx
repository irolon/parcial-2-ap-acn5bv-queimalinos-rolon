import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import { kgLabel } from '@/utils/sessions/workoutFormat';

/** Confirmación de borrar una serie ya registrada: "¿Borrar la serie N?". Sin `set`, está cerrado. */
export default function DeleteSetDialog({ set, onCancel, onConfirm }) {
  return (
    <Dialog
      open={Boolean(set)}
      onOpenChange={(next) => !next && onCancel()}
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
