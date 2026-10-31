import { useState } from 'react';
import { Trophy } from 'lucide-react';
import ChallengeSection from '@/components/challenges/ChallengeSection';
import DeleteChallengeDialog from '@/components/challenges/dialogs/DeleteChallengeDialog';
import Button from '@/components/shared/ui/Button';
import EmptyState from '@/components/shared/states/EmptyState';
import QueryState from '@/components/shared/states/QueryState';
import { useChallengesQuery } from '@/hooks/challenges/useChallenges';

/** Desafíos del entrenador: plantillas globales y los propios, con asignar y borrar. */
export default function ChallengesPage() {
  const query = useChallengesQuery();
  // Diálogo de alta/asignación: `{ type: 'new' | 'assign', challenge? }` (los monta la tarjeta 43, tarea 5).
  const [dialog, setDialog] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const openNew = () => setDialog({ type: 'new' });
  const openAssign = (challenge) => setDialog({ type: 'assign', challenge });

  return (
    <section className="flex flex-col gap-6" data-dialog={dialog?.type}>
      <QueryState query={query} empty={{ icon: Trophy, title: 'Todavía no hay desafíos' }}>
        {(challenges) => {
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
        }}
      </QueryState>
      {toDelete && <DeleteChallengeDialog challenge={toDelete} onClose={() => setToDelete(null)} />}
    </section>
  );
}
