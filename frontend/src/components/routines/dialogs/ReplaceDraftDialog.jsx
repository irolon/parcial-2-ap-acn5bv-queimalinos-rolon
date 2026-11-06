import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';

/** Al abrir un bloque de la IA con un borrador manual sin asignar: reemplazarlo por el bloque o conservarlo. */
export default function ReplaceDraftDialog({ onReplace, onKeep }) {
  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onKeep()}
      title="Tenés un borrador sin asignar. ¿Reemplazarlo por este bloque?"
      description="Si lo reemplazás, se pierde lo que armaste a mano. No se puede deshacer."
      footer={
        <>
          <Button variant="ghost" onClick={onKeep}>Conservar el borrador</Button>
          <Button variant="danger" onClick={onReplace}>Reemplazar</Button>
        </>
      }
    />
  );
}
