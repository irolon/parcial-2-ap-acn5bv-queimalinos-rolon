import { useEffect, useState } from 'react';
import { readAiSession, writeAiSession } from '@/utils/trainer-ai/proposalStore';

/**
 * La sesión del asistente (formulario, propuesta, bloques asignados y plantillas guardadas) sincronizada con
 * `sessionStorage`, para que el ida y vuelta con el editor y una recarga no la pierdan. Devuelve `[session, setSession]`.
 */
export function useAiSession(trainerId) {
  const [session, setSession] = useState(() => readAiSession(trainerId));
  useEffect(() => {
    if (session) writeAiSession(trainerId, session);
  }, [trainerId, session]);
  return [session, setSession];
}
