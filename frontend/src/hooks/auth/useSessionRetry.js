import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from './useAuthStore';

const BACKOFF = [2, 4, 8, 16];
const RETRY_EVERY = 30;

/** Segundos de espera antes del intento `attempt` (0, 1, 2…): 2, 4, 8, 16 y después cada 30, sin tope. */
export const retryDelay = (attempt) => BACKOFF[attempt] ?? RETRY_EVERY;

/**
 * Mientras la sesión está `offline`, reintenta `retry()` con espera creciente, al instante cuando el
 * navegador avisa que volvió la red (`online`) y con `retryNow()` (el botón "Reintentar ahora").
 * Al salir de `offline` o al desmontar, limpia el timer y el listener.
 * @returns {{ secondsLeft: number, retrying: boolean, retryNow: () => Promise<void> }}
 */
export function useSessionRetry() {
  const offline = useAuthStore((s) => s.status === 'offline');
  const retry = useAuthStore((s) => s.retry);
  const attempt = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(retryDelay(0));
  const [retrying, setRetrying] = useState(false);
  // Sube con cada intento terminado: rearma la cuenta atrás aunque `retrying` true → false se junten en un render.
  const [round, setRound] = useState(0);
  const busy = useRef(false);

  // Un solo pedido a la vez: el botón, el evento `online` y el timer no se pisan.
  const retryNow = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setRetrying(true);
    try {
      await retry();
    } finally {
      busy.current = false;
      attempt.current += 1;
      setSecondsLeft(retryDelay(attempt.current));
      setRetrying(false);
      setRound((n) => n + 1);
    }
  }, [retry]);

  // Cuenta atrás hasta el próximo intento; se rearma cada vez que termina uno.
  useEffect(() => {
    if (!offline || retrying) return undefined;
    let left = retryDelay(attempt.current);
    const id = setInterval(() => {
      left -= 1;
      if (left > 0) {
        setSecondsLeft(left);
        return;
      }
      clearInterval(id);
      retryNow();
    }, 1000);
    return () => clearInterval(id);
  }, [offline, retrying, round, retryNow]);

  useEffect(() => {
    if (!offline) return undefined;
    const onOnline = () => retryNow();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [offline, retryNow]);

  return { secondsLeft, retrying, retryNow };
}
