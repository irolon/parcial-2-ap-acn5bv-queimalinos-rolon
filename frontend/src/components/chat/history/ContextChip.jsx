import { contextLabel } from '@/utils/chat/chatHistory';

/** "CONTEXTO · PUSH · PRESS BANCA" centrado, antes de la consulta: sobre qué rutina y ejercicio se preguntó. */
export default function ContextChip({ message }) {
  const label = contextLabel(message);
  if (!label) return null;
  return (
    <p className="self-center rounded-pill border border-ink3 bg-ink2 px-3 py-1 font-mono text-[9px] tracking-[0.5px] text-ink6">
      {label}
    </p>
  );
}
