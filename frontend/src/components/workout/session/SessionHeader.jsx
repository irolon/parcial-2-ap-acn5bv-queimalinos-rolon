import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { ASSISTANT_PANEL_ID } from '@/components/chat/AssistantPanel';
import Button from '@/components/shared/ui/Button';
import { useNow } from '@/hooks/shared/useNow';
import { formatElapsed } from '@/utils/sessions/workoutFormat';

// En un celular los botones de moverse y el del asistente quedan en solo el ícono (el lector de pantalla sigue
// leyendo el nombre).
const LABEL = 'sr-only sm:not-sr-only';

/**
 * "EJERCICIO 3 DE 6 · 22:14 TRANSCURRIDO" (el reloj corre solo), con Asistente, Anterior, Siguiente y Terminar.
 * `position` va de 1 a `total`; Anterior y Siguiente se apagan en los extremos. Asistente abre o cierra el panel
 * (`assistantOpen`); `assistantRef` es su ref, para devolverle el foco al cerrar el panel.
 */
export default function SessionHeader({
  position, total, startedAt, onPrev, onNext, onFinish, onAssistant, assistantOpen = false, assistantRef,
}) {
  const elapsed = formatElapsed(useNow().getTime() - Date.parse(startedAt));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="font-mono text-[11px] tracking-[0.5px] text-ink6">
        {`EJERCICIO ${position} DE ${total} · ${elapsed} TRANSCURRIDO`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          ref={assistantRef}
          variant="ghost"
          aria-expanded={assistantOpen}
          aria-controls={assistantOpen ? ASSISTANT_PANEL_ID : undefined}
          onClick={onAssistant}
        >
          <Sparkles size={16} aria-hidden="true" />
          <span className={LABEL}>Asistente</span>
        </Button>
        <Button variant="ghost" disabled={position <= 1} onClick={onPrev}>
          <ChevronLeft size={16} aria-hidden="true" />
          <span className={LABEL}>Anterior</span>
        </Button>
        <Button variant="ghost" disabled={position >= total} onClick={onNext}>
          <span className={LABEL}>Siguiente</span>
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
        <Button variant="dark" onClick={onFinish}>
          <X size={16} aria-hidden="true" />
          Terminar
        </Button>
      </div>
    </div>
  );
}
