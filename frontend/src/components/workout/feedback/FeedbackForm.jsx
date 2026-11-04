import { useEffect, useId, useRef, useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import Textarea from '@/components/shared/ui/Textarea';
import { rpeLabel } from '@/utils/sessions/rpe';
import RpeScale from './RpeScale';

const MAX_NOTES = 1000;

/**
 * "¿Qué tan dura fue?" al terminar: RPE de 1 a 10 (con su etiqueta) y una nota opcional de hasta 1000 caracteres.
 * Guardar espera a que haya un RPE o una nota (sin nada sería lo mismo que Saltar). `onSave({ rpe, notes })`, `onSkip()`.
 */
export default function FeedbackForm({ onSave, onSkip }) {
  const titleId = useId();
  const titleRef = useRef(null);
  const [rpe, setRpe] = useState(null);
  const [notes, setNotes] = useState('');
  const canSave = rpe !== null || notes.trim() !== '';
  const label = rpeLabel(rpe);

  // Reemplaza a la pantalla de entrenamiento: el foco va a la pregunta para que el lector de pantalla la anuncie.
  useEffect(() => titleRef.current?.focus(), []);

  function submit(event) {
    event.preventDefault();
    if (canSave) onSave({ rpe, notes });
  }

  return (
    <Card padding={24} className="mx-auto w-full max-w-xl">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <h2 id={titleId} ref={titleRef} tabIndex={-1} className="font-display text-xl font-semibold text-bone0 outline-none">
          ¿Qué tan dura fue?
        </h2>
        <RpeScale value={rpe} onChange={setRpe} labelledBy={titleId} />
        <p role="status" className="-mt-2 min-h-5 font-body text-sm text-ink6">
          {label ? `${rpe} · ${label}` : ''}
        </p>
        <Textarea
          label="Nota (opcional)"
          value={notes}
          maxLength={MAX_NOTES}
          hint={`${notes.length}/${MAX_NOTES}`}
          onChange={(event) => setNotes(event.target.value)}
        />
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button type="submit" size="lg" disabled={!canSave} className="sm:flex-1">
            Guardar
          </Button>
          <Button variant="ghost" size="lg" onClick={onSkip}>
            Saltar
          </Button>
        </div>
      </form>
    </Card>
  );
}
