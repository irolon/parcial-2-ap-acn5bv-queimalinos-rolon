import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import { useDeleteChallenge } from '@/hooks/challenges/useChallenges';
import { useSubmitLock } from '@/hooks/shared/useSubmitLock';

const CONFLICT = 'Ya está asignado a alumnos: no se puede borrar';
const FALLBACK = 'No pudimos borrar el desafío';

/** Confirmación del borrado; si ya se asignó a alguien (409) avisa y queda abierto. */
export default function DeleteChallengeDialog({ challenge, onClose }) {
  const [error, setError] = useState(null);
  const remove = useDeleteChallenge();
  const lock = useSubmitLock();

  async function handleConfirm() {
    setError(null);
    try {
      await remove.mutateAsync(challenge.id);
      onClose();
    } catch (err) {
      setError(err?.status === 409 ? CONFLICT : FALLBACK);
    }
  }

  return (
    <Dialog
      open
      dismissible={!remove.isPending}
      onOpenChange={(next) => !next && onClose()}
      title={`¿Borrar "${challenge.name}"?`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={remove.isPending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => lock(handleConfirm)} loading={remove.isPending}>
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
      <p className="font-body text-sm text-ink6">Se borra para siempre. Solo se puede si todavía no lo asignaste a nadie.</p>
    </Dialog>
  );
}
