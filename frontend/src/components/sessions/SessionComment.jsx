import { useRef, useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Textarea from '@/components/shared/ui/Textarea';
import { useCommentSession } from '@/hooks/sessions/useSessions';

/** Comentario del entrenador editable en línea: Guardar/Cancelar aparecen recién cuando cambia el texto. */
export default function SessionComment({ studentId, session }) {
  const saved = session.trainer_comment ?? '';
  const [draft, setDraft] = useState(saved);
  const mutation = useCommentSession(studentId);
  const busy = useRef(false);
  const dirty = draft.trim() !== saved;

  const save = () => {
    if (!dirty || busy.current) return;
    busy.current = true;
    const comment = draft.trim();
    mutation.mutate(
      { sessionId: session.id, comment },
      {
        onSuccess: () => setDraft(comment),
        onSettled: () => {
          busy.current = false;
        },
      },
    );
  };

  const cancel = () => {
    mutation.reset();
    setDraft(saved);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      save();
    }
  };

  return (
    <div className="mt-4">
      <Textarea
        label="Comentario del entrenador"
        value={draft}
        maxLength={1000}
        placeholder="Dejale un comentario sobre esta sesión"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        error={mutation.isError ? (mutation.error?.message ?? 'No pudimos guardar el comentario') : undefined}
      />
      {dirty && (
        <div className="mt-2 flex gap-2">
          <Button size="sm" loading={mutation.isPending} onClick={save}>
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={cancel}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
