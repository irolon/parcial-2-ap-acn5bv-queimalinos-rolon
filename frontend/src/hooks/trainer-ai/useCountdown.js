import { useEffect, useState } from 'react';

/** Segundos que faltan de una cuenta atrás de `seconds` que arranca al montar (0 al terminar). */
export function useCountdown(seconds) {
  const [deadline] = useState(() => Date.now() + seconds * 1000);
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  const running = left > 0;
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return left;
}
