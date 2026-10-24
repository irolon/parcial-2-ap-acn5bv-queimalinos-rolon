import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import { useDeleteExercise } from '@/hooks/exercises/useExercises';
import { fieldErrorsFrom } from '@/utils/fieldErrors';

/** Confirmación de borrado; ante un error (p. ej. 409 en uso) queda abierto con el mensaje. */
export default function DeleteExerciseDialog({ exercise, onClose }) {
  const [error, setError] = useState(null);
  const remove = useDeleteExercise();

  async function handleDelete() {
    setError(null);
    try {
      await remove.mutateAsync(exercise.id);
      onClose();
    } catch (err) {
      setError(fieldErrorsFrom(err, { fields: [], fallback: 'No pudimos borrar el ejercicio' }).form);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={`¿Borrar «${exercise.name}»?`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={remove.isPending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={remove.isPending}>
            Borrar
          </Button>
        </>
      }
    >
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-md border border-hot/25 bg-hot/[0.14] px-3 py-2.5 font-body text-sm text-hot"
        >
          {error}
        </p>
      )}
      <p className="font-body text-sm text-ink6">Esta acción no se puede deshacer.</p>
    </Dialog>
  );
}
