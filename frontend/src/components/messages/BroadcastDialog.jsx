import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import { useBroadcast } from '@/hooks/messages/useBroadcast';
import { studentsLabel } from '@/utils/messages/studentsLabel';
import StudentPicker from './StudentPicker';

const MAX_BODY = 2000;
const NOTICE = 'Cada alumno lo recibe en su conversación individual. No es un chat grupal: no se ven entre ellos.';

function BroadcastForm({ students, broadcast, onClose, onSent }) {
  const [picked, setPicked] = useState([]);
  const [body, setBody] = useState('');
  const { mutate, isPending, error } = broadcast;
  // Solo cuentan los alumnos que siguen en la lista actual (puede cambiar con el polling).
  const selected = picked.filter((id) => students.some((s) => s.id === id));
  const text = body.trim();
  const canSend = text.length > 0 && selected.length > 0 && !isPending;

  const submit = (event) => {
    event.preventDefault();
    if (!canSend) return;
    mutate(
      { studentIds: selected, body: text },
      {
        onSuccess: (result) => {
          onSent(result?.sent ?? selected.length);
          onClose();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="rounded-md border border-ink3 bg-ink2 px-3 py-2 font-body text-sm text-ink6">{NOTICE}</p>
      <StudentPicker students={students} selected={selected} onChange={setPicked} />
      <div>
        <label htmlFor="broadcast-body" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[1px] text-ink6">
          Mensaje
        </label>
        <textarea
          id="broadcast-body"
          value={body}
          maxLength={MAX_BODY}
          rows={4}
          onChange={(event) => setBody(event.target.value)}
          className="w-full resize-y rounded-md border border-ink3 bg-ink1 px-3.5 py-3 font-body text-sm text-bone0 outline-none placeholder:text-ink5 focus:border-accentText"
        />
      </div>
      {error && (
        <p role="alert" className="font-body text-sm text-hot">
          {error.message || 'No pudimos enviar el mensaje.'}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSend} loading={isPending}>
          Enviar a {studentsLabel(selected.length)}
        </Button>
      </div>
    </form>
  );
}

/** Envío masivo de texto del PT: cada alumno lo recibe en su conversación individual. */
export default function BroadcastDialog({ open, onOpenChange, students, onSent }) {
  const broadcast = useBroadcast();
  const change = (next) => {
    if (!next) broadcast.reset();
    onOpenChange(next);
  };
  return (
    <Dialog open={open} onOpenChange={change} title="Envío masivo" dismissible={!broadcast.isPending}>
      <BroadcastForm students={students} broadcast={broadcast} onClose={() => change(false)} onSent={onSent} />
    </Dialog>
  );
}
