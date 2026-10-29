import { useEffect, useState } from 'react';
import QueryState from '@/components/shared/states/QueryState';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import { useTemplateQuery, useTemplatesQuery } from '@/hooks/routine-templates/useRoutineTemplates';
import { fromTemplate } from '@/utils/routines/editorState';
import { formatRoutineDays } from '@/utils/students/routineDays';
import { goalLabel } from '@/utils/students/studentOptions';

const count = (n) => `${n} ${n === 1 ? 'ejercicio' : 'ejercicios'}`;
const CARD =
  'w-full cursor-pointer rounded-lg border border-ink3 px-4 py-3 text-left hover:bg-ink2 focus-visible:outline-2 focus-visible:outline-accentText';

function TemplateList({ items, onPick }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((t) => (
        <li key={t.id}>
          <button type="button" onClick={() => onPick(t)} className={CARD}>
            <span className="block font-display text-sm font-semibold text-bone0">{t.name}</span>
            <span className="block font-body text-xs text-ink6">
              <span>{goalLabel(t.goal)}</span> · <span>{formatRoutineDays(t.days)}</span> · <span>{count(t.exercise_count)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Elegir una plantilla y cargarla en el editor. Con `hasContent` pide confirmar antes de reemplazar.
 * `exercisesById` es la biblioteca ya cargada: `onLoad(state, missing)` recibe el estado y los ejercicios que faltan.
 */
export default function UseTemplateDialog({ hasContent, exercisesById, onLoad, onClose }) {
  const templates = useTemplatesQuery();
  const [picked, setPicked] = useState(null);
  const [confirmed, setConfirmed] = useState(!hasContent);
  const detail = useTemplateQuery(picked?.id, { enabled: confirmed });
  const loaded = confirmed ? detail.data : null;

  useEffect(() => {
    if (!loaded) return;
    const { state, missing } = fromTemplate(loaded, exercisesById);
    onLoad(state, missing);
  }, [loaded, exercisesById, onLoad]);

  const confirming = picked && !confirmed;
  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={confirming ? 'Vas a reemplazar lo que armaste' : 'Usar plantilla'}
      description={confirming ? 'Se pierde lo que tenés en el editor. No se puede deshacer.' : undefined}
      footer={confirming && (
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" onClick={() => setConfirmed(true)}>Reemplazar</Button>
        </>
      )}
    >
      {picked && confirmed && !detail.isError && <p role="status" className="font-body text-sm text-ink6">Cargando plantilla…</p>}
      {detail.isError && (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="font-body text-sm text-hot">No pudimos cargar la plantilla</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => detail.refetch()}>Reintentar</Button>
            <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>Elegir otra</Button>
          </div>
        </div>
      )}
      {!picked && (
        <QueryState query={templates} empty={{ title: 'Todavía no tenés plantillas' }}>
          {(items) => <TemplateList items={items} onPick={setPicked} />}
        </QueryState>
      )}
    </Dialog>
  );
}
