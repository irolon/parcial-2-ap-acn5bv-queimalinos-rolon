import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';

/** La rutina cambió desde que se abrió el editor: recargarla (se pierde lo de la pantalla) o guardar igual. */
export default function ConflictDialog({ onReload, onSaveAnyway, onClose }) {
  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onClose()}
      title="La rutina cambió desde que la abriste"
      description="Alguien la modificó mientras la editabas (por ejemplo, desde el celular). Si la recargás, se pierde lo que cambiaste acá; si guardás igual, tus cambios pisan los otros."
      footer={
        <>
          <Button variant="ghost" onClick={onReload}>Recargar</Button>
          <Button variant="danger" onClick={onSaveAnyway}>Guardar igual</Button>
        </>
      }
    />
  );
}
