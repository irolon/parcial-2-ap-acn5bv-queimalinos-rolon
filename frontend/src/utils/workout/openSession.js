import { deleteSession, openSession } from '@/api/sessions/sessions.api';
import { sessionBody } from './uploadPayload';

const defaultApi = { openSession, deleteSession };

// Aperturas en vuelo por id de sesión: un Descartar inmediato espera a que el POST termine antes de borrar.
const opening = new Map();

/**
 * Abre la sesión en el servidor al empezar (GX4: `POST /sessions` sin `finished_at`), así el PT la ve "En curso".
 * Best-effort: traga cualquier error (sin red, 5xx o algo que no es HTTP) y, si `shouldSend()` da false (por ejemplo,
 * la sesión de la web está `offline`), no pide nada. No toca `upload`: la subida final repite el POST con el mismo id y
 * el servidor lo toma como reintento (completa `finished_at`, RPE y notas).
 */
export function openOnServer(workout, { api = defaultApi, shouldSend = () => true } = {}) {
  if (!workout || !shouldSend()) return Promise.resolve();
  const { id } = workout;
  const pending = Promise.resolve()
    .then(() => api.openSession(sessionBody(workout)))
    .then(() => undefined, () => undefined)
    .finally(() => {
      if (opening.get(id) === pending) opening.delete(id);
    });
  opening.set(id, pending);
  return pending;
}

/**
 * Borra en el servidor la sesión abierta que se descartó (`DELETE /sessions/:id`), después de esperar su apertura si
 * sigue en vuelo. Ignora el 404 y los errores de red: si no se pudo borrar, la abierta vence a las 4 h.
 */
export async function closeOnServer(id, { api = defaultApi, shouldSend = () => true } = {}) {
  await opening.get(id);
  if (!shouldSend()) return;
  try {
    await api.deleteSession(id);
  } catch {
    // Best-effort (ver arriba).
  }
}
