import { useCallback, useEffect, useState } from 'react';
import { readAiSession, writeAiSession } from '@/utils/trainer-ai/proposalStore';

/**
 * La sesión del asistente (formulario, propuesta, bloques asignados y plantillas guardadas) sincronizada con
 * `sessionStorage`, para que el ida y vuelta con el editor y una recarga no la pierdan. Si cambia el entrenador se
 * vuelve a leer la suya. Devuelve `[session, setSession]`.
 */
export function useAiSession(trainerId) {
  const [current, setCurrent] = useState(() => ({ trainerId, session: readAiSession(trainerId) }));
  if (current.trainerId !== trainerId) setCurrent({ trainerId, session: readAiSession(trainerId) });
  const session = current.trainerId === trainerId ? current.session : readAiSession(trainerId);

  const setSession = useCallback((next) => setCurrent((c) => ({
    ...c,
    session: typeof next === 'function' ? next(c.session) : next,
  })), []);

  useEffect(() => {
    if (current.session) writeAiSession(current.trainerId, current.session);
  }, [current]);
  return [session, setSession];
}
