import { useEffect, useState } from 'react';
import { msToNextChange } from '@/utils/agenda/studentAgenda';

/**
 * El instante actual para Mis turnos ("Ya pasó", "Cancelar" y el límite de pendientes): se renueva justo cuando
 * empieza el próximo turno de `appointments` o, si falta más, cada minuto. También al volver a la pestaña (en segundo
 * plano los navegadores frenan los timers).
 */
export function useAgendaClock(appointments) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setTimeout(tick, msToNextChange(appointments, now));
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [appointments, now]);
  return now;
}
