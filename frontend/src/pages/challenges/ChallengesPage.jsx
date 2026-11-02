import { useState } from 'react';
import { Trophy } from 'lucide-react';
import ChallengeSection from '@/components/challenges/ChallengeSection';
import AssignChallengeDialog from '@/components/challenges/dialogs/AssignChallengeDialog';
import DeleteChallengeDialog from '@/components/challenges/dialogs/DeleteChallengeDialog';
import NewChallengeDialog from '@/components/challenges/dialogs/NewChallengeDialog';
import Button from '@/components/shared/ui/Button';
import EmptyState from '@/components/shared/states/EmptyState';
import QueryState from '@/components/shared/states/QueryState';
import { useChallengesQuery } from '@/hooks/challenges/useChallenges';

/** Desafíos del entrenador: plantillas globales y los propios, con crear, asignar y borrar. */
export default function ChallengesPage() {
  const query = useChallengesQuery();
  // `{ type: 'new' }` o `{ type: 'assign', challenge, fresh? }` (`fresh`: recién creado, se ofrece "Ahora no").
  const [dialog, setDialog] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const openNew = () => setDialog({ type: 'new' });
  const openAssign = (challenge) => setDialog({ type: 'assign', challenge });
  const closeDialog = () => setDialog(null);

  const content = (challenges) => {
    const templates = challenges.filter((c) => c.trainer_id === null);
    const own = challenges.filter((c) => c.trainer_id !== null);
    return (
      <>
        {own.length > 0 && (
          <div className="flex justify-end">
            <Button onClick={openNew}>Nuevo desafío</Button>
          </div>
        )}
        <ChallengeSection title="Plantillas" challenges={templates} onAssign={openAssign} onDelete={setToDelete} />
        <ChallengeSection
          title="Mis desafíos"
          challenges={own}
          onAssign={openAssign}
          onDelete={setToDelete}
          empty={
            <div className="flex flex-col items-center">
              <EmptyState icon={Trophy} title="Todavía no creaste desafíos" />
              <Button onClick={openNew}>Nuevo desafío</Button>
            </div>
          }
        />
      </>
    );
  };

  return (
    <section className="flex flex-col gap-6">
      {/* Sin ningún desafío no va el vacío genérico: "Mis desafíos" ya invita a crear el primero. */}
      {query.isSuccess && query.data.length === 0 ? content([]) : <QueryState query={query}>{content}</QueryState>}
      {dialog?.type === 'new' && (
        <NewChallengeDialog
          open
          onClose={closeDialog}
          onCreated={(challenge) => setDialog({ type: 'assign', challenge, fresh: true })}
        />
      )}
      {dialog?.type === 'assign' && (
        <AssignChallengeDialog
          challenge={dialog.challenge}
          onClose={closeDialog}
          cancelLabel={dialog.fresh ? 'Ahora no' : undefined}
        />
      )}
      {toDelete && <DeleteChallengeDialog challenge={toDelete} onClose={() => setToDelete(null)} />}
    </section>
  );
}
