import { Loader2 } from 'lucide-react';
import Button from '@/components/shared/ui/Button';
import { useSecondsSince } from '@/hooks/routines/useSecondsSince';

/** Segundo mensaje según lo que va tardando (el LLM tarda de 5 a 20 s; el backend corta a los 30). */
function stepMessage(seconds, hasStudent) {
  if (seconds >= 18) return 'Ya casi…';
  if (seconds >= 8) return 'Eligiendo ejercicios de tu biblioteca…';
  return hasStudent ? 'Mirando los datos del alumno y tu biblioteca…' : 'Mirando tu biblioteca…';
}

/** Espera de la propuesta: estado explícito, segundos transcurridos y "Cancelar". `hasStudent`: se generó con alumno. */
export default function AiWaiting({ startedAt, hasStudent = false, onCancel }) {
  const seconds = useSecondsSince(startedAt) ?? 0;
  return (
    <div className="flex max-w-3xl flex-col items-center gap-4 rounded-xl border border-ink2 bg-ink1 px-6 py-12 text-center">
      <Loader2 size={28} className="animate-spin text-accentText" aria-hidden="true" />
      <div role="status" className="flex flex-col gap-1">
        <p className="font-display text-[15px] font-semibold text-bone0">Armando la rutina…</p>
        <p className="font-body text-sm text-ink6">{stepMessage(seconds, hasStudent)}</p>
      </div>
      <p className="font-mono text-xs text-ink6">
        <span className="sr-only">Segundos transcurridos:</span> <span>{`${seconds} s`}</span>
      </p>
      <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
    </div>
  );
}
