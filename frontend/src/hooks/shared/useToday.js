import { useEffect, useState } from 'react';
import { argentinaDate } from '@/utils/dates';

const CHECK_EVERY_MS = 60_000;

const sameDay = (a, b) => argentinaDate(a).dayNumber === argentinaDate(b).dayNumber;

/**
 * Un instante de hoy (hora argentina) para las pantallas que muestran la fecha: no cambia mientras siga siendo el
 * mismo día, así que solo vuelve a renderizar cuando pasa la medianoche. Lo revisa cada minuto y al volver a la
 * pestaña (la que quedó abierta de un día para otro), sin esperar al reloj.
 */
export function useToday() {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const check = () => setToday((current) => (sameDay(current, new Date()) ? current : new Date()));
    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);
  return today;
}
