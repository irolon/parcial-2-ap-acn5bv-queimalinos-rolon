import { useEffect, useState } from 'react';

/**
 * El instante actual, renovado cada `intervalMs` (1 s por defecto) para las pantallas con un reloj en vivo (el
 * descanso y el tiempo transcurrido). El tiempo se calcula siempre contra este instante absoluto, así que un timer
 * que se atrasa no corre la cuenta: al volver a la pestaña (los navegadores frenan los timers en segundo plano) se
 * pone al día sin esperar al próximo tick.
 */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);
  return now;
}
