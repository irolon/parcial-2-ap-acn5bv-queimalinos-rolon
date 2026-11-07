import { useEffect, useState } from 'react';

// El backend corta a los 10 s: la barra se llena en ese tiempo, así se ve cuánto puede faltar como mucho.
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
