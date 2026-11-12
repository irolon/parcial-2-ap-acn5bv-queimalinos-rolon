import { useRef, useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import Input from '@/components/shared/ui/Input';
import { useSaveAsTemplates } from '@/hooks/trainer-ai/useSaveAsTemplates';
import { fieldErrorsFrom } from '@/utils/fieldErrors';

const FORM_ID = 'save-ai-templates-form';
const MAX_NAME = 120;
const NAME_ERROR = `Poné un nombre de hasta ${MAX_NAME} caracteres`;

/**
 * Guarda la propuesta como plantillas (`POST /trainer-ai/save-as-template`, un solo pedido aunque se haga doble clic).
 * Con varios bloques aclara que se crea una por bloque. `onSaved(result)` recibe `{ templates }` o, con un 409,
 * `{ already: true }` (la propuesta ya estaba guardada).
 */
export default function SaveTemplatesDialog({ generationId, blocks, onSaved, onClose }) {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const save = useSaveAsTemplates();
  const sending = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending.current) return;
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > MAX_NAME) {
      setError({ name: NAME_ERROR });
      return;
    }
    sending.current = true;
    setError(null);
    try {
      const data = await save.mutateAsync({ generation_id: generationId, template_name: trimmed });
      onSaved({ templates: data.templates });
    } catch (err) {
      sending.current = false;
      if (err?.code === 'GENERATION_ALREADY_SAVED') onSaved({ already: true });
      else setError({ form: fieldErrorsFrom(err, { fields: [], fallback: 'No pudimos guardar las plantillas' }).form });
    }
  }

  return (
    <Dialog
      open
      dismissible={!save.isPending}
      onOpenChange={(next) => !next && onClose()}
      title="Guardar como plantillas"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} loading={save.isPending}>Guardar</Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {error?.form && <p role="alert" className="font-mono text-xs text-hot">{error.form}</p>}
        <Input label="Nombre" value={name} maxLength={MAX_NAME} error={error?.name} onChange={(event) => setName(event.target.value)} />
        {blocks > 1 && (
          <p className="font-body text-sm text-ink6">Se crea una plantilla por bloque: &quot;Nombre · Bloque&quot;.</p>
        )}
        <p className="font-body text-xs text-ink6">Es opcional: para asignar no hace falta guardarla.</p>
      </form>
    </Dialog>
  );
}
