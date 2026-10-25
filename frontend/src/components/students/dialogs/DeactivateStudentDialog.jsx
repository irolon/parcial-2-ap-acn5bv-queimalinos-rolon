import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import { useUpdateStudent } from '@/hooks/students/useStudents';
import { fieldErrorsFrom } from '@/utils/fieldErrors';

/** Confirmación de la baja: no es inmediata, el acceso abierto puede seguir hasta 1 hora. */
export default function DeactivateStudentDialog({ student, onClose }) {
  const [error, setError] = useState(null);
  const update = useUpdateStudent(student.id);

  async function handleConfirm() {
    if (update.isPending) return;
    setError(null);
    try {
      await update.mutateAsync({ active: false });
      onClose();
    } catch (err) {
      setError(fieldErrorsFrom(err, { fields: [], fallback: 'No pudimos dar de baja al alumno' }).form);
    }
  }

  return (
    <Dialog
      open
      dismissible={!update.isPending}
      onOpenChange={(next) => !next && onClose()}
      title={`¿Dar de baja a ${student.name}?`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={update.isPending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={update.isPending}>
            Dar de baja
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
      <p className="font-body text-sm text-ink6">
        No va a poder entrar a la app. El acceso que ya tiene abierto puede seguir hasta 1 hora.
      </p>
    </Dialog>
  );
}
