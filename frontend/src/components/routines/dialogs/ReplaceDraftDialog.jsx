import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';

const lostPart = (draftBlockName) => (draftBlockName ? `el bloque "${draftBlockName}" que estabas editando` : 'lo que armaste a mano');

/**
 * Al abrir un bloque de la IA con un borrador sin asignar: reemplazarlo por el bloque o conservarlo.
 * `draftBlockName`: el borrador es otro bloque de la misma propuesta (si no, es uno armado a mano).
 */
export default function ReplaceDraftDialog({ draftBlockName = null, onReplace, onKeep }) {
  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onKeep()}
      title="Tenés un borrador sin asignar. ¿Reemplazarlo por este bloque?"
      description={`Si lo reemplazás, se pierde ${lostPart(draftBlockName)}. No se puede deshacer.`}
      footer={
        <>
          <Button variant="ghost" onClick={onKeep}>Conservar el borrador</Button>
          <Button variant="danger" onClick={onReplace}>Reemplazar</Button>
        </>
      }
    />
  );
}
