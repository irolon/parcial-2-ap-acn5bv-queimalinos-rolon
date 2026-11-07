import { useEffect, useState } from 'react';

// Tope visual del spec (RNF-04: respuesta en menos de 10 s). El backend corta a los 9 s, así que la barra no llega a
// llenarse sin que aparezca la respuesta o el aviso.
const VISUAL_CAP = 'width 10s linear';

/** "Pensando…" mientras el asistente contesta, con una barra que se llena en 10 s. */
export default function ChatThinking() {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div role="status" aria-label="Pensando…" className="flex w-40 flex-col gap-1.5 self-start">
      <span className="font-mono text-[11px] text-ink6">Pensando…</span>
      <span aria-hidden="true" className="h-1 overflow-hidden rounded-pill bg-ink3">
        <span className="block h-full bg-accent" style={{ width: started ? '100%' : '0%', transition: VISUAL_CAP }} />
      </span>
    </div>
  );
}
