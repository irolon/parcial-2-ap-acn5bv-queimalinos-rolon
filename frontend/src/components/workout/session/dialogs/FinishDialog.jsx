import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';

const missingMessage = (n) => (n === 1 ? 'Te falta 1 serie, ¿terminar igual?' : `Te faltan ${n} series, ¿terminar igual?`);

/**
 * Confirmación de Terminar cuando hay algo que decidir:
 * - con series faltantes: "Te faltan N series, ¿terminar igual?" (Terminar igual / Seguir entrenando);
 * - sin ninguna serie: "No registraste ninguna serie. ¿Descartar el entrenamiento?" (Descartar / Seguir entrenando).
 * Cerrarlo (Esc, la X o Seguir entrenando) es `onKeep`.
 */
export default function FinishDialog({ open, hasSets, missing, onKeep, onFinish, onDiscard }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && onKeep()}
      title={hasSets ? missingMessage(missing) : 'No registraste ninguna serie. ¿Descartar el entrenamiento?'}
      footer={
        <>
          <Button variant="ghost" onClick={onKeep}>Seguir entrenando</Button>
          {hasSets ? (
            <Button onClick={onFinish}>Terminar igual</Button>
          ) : (
            <Button variant="danger" onClick={onDiscard}>Descartar</Button>
          )}
        </>
      }
    />
  );
}
