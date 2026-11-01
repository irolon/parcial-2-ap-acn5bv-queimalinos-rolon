import {
  applyBatch, applySession, batches, pendingSets, resetSession, sessionBody, setBody,
} from './uploadPayload';

const isObject = (value) => typeof value === 'object' && value !== null;

const failure = (code, message) => Object.assign(new Error(message), { code });

/**
 * Sin red, timeout, 5xx, 429 o 401 (o algo que no es HTTP, como una respuesta ilegible) se puede reintentar; otro 4xx,
 * no. El 401 llega si no se pudo renovar la sesión: después de volver a entrar, la subida sigue.
 */
const isRetryable = (status) => status === null || status === 0 || status >= 500 || [401, 408, 429].includes(status);

function describe(err) {
  const status = Number.isInteger(err?.status) ? err.status : null;
  return {
    status,
    code: err?.code ?? 'UNEXPECTED',
    message: err?.message ?? 'Error inesperado',
    retryable: isRetryable(status),
  };
}

const outcome = (state, result) => ({ ...result, state, failed: state.upload.failed, unlocked: state.upload.unlocked });

/**
 * Sube una sesión como el celular (SessionUploader.kt): POST /sessions con el feedback y después las series que
 * faltan, en lotes de 100. Es reanudable: cada paso que el servidor confirma queda en `state.upload` y se avisa con
 * `onState(nuevoEstado)` para guardarlo, así un reintento sigue desde ahí sin repetir la sesión ni las series ya
 * confirmadas (y si repitiera, los dos endpoints son idempotentes por id).
 * - Sin red, timeout o 5xx: corta y devuelve el error con `retryable: true`.
 * - Otro 4xx: error permanente (`retryable: false`), tal cual vino; 409 es que el id de la sesión es de otro alumno.
 * - 404 en las series: la sesión no existe; se vuelve a crear y se reenvían todas, una sola vez por llamada.
 * - `failed` de un lote: rechazos por serie, permanentes. Se juntan, no se reenvían y la subida termina igual.
 * - `unlocked_achievements` de cualquier respuesta: se juntan sin repetir.
 * - `shouldContinue()` se mira antes de cada pedido: si da false (se descartó la sesión), no sale ninguno más y
 *   vuelve `{ ok: false, cancelled: true }` con error `CANCELLED`. Lo que ya estaba en vuelo termina igual, salvo
 *   que lo corte `signal`; si un pedido falla cuando `shouldContinue()` ya da false, también vuelve como cancelada.
 * @returns {Promise<{ ok: boolean, cancelled?: true, state, failed: {id, code}[], unlocked: object[],
 *   error?: { status, code, message, retryable } }>}
 */
export async function uploadWorkout({ api, state, onState = () => {}, shouldContinue = () => true, signal }) {
  let current = state;
  const commit = (next) => {
    current = next;
    onState(next);
  };
  const cancelled = () => outcome(current, {
    ok: false,
    cancelled: true,
    error: { status: null, code: 'CANCELLED', message: 'Se canceló la subida', retryable: false },
  });
  let recreated = false;
  while (true) {
    let step = 'session';
    try {
      if (!current.upload.sessionCreated) {
        if (!shouldContinue()) return cancelled();
        const data = await api.createSession(sessionBody(current), { signal });
        if (!isObject(data)) throw failure('BAD_RESPONSE', 'El servidor respondió sin la sesión');
        commit(applySession(current, data));
      }
      step = 'sets';
      for (const batch of batches(pendingSets(current))) {
        if (!shouldContinue()) return cancelled();
        const data = await api.uploadSets(current.id, batch.map(setBody), { signal });
        if (!isObject(data)) throw failure('BAD_RESPONSE', 'El servidor respondió sin el resultado del lote');
        commit(applyBatch(current, batch, data));
      }
      if (pendingSets(current).length > 0) throw failure('INCOMPLETE', 'El servidor no confirmó todas las series');
      return outcome(current, { ok: true });
    } catch (err) {
      if (!shouldContinue()) return cancelled();
      const sessionGone = step === 'sets' && err?.status === 404;
      if (!sessionGone || recreated) return outcome(current, { ok: false, error: describe(err) });
      recreated = true;
      commit(resetSession(current));
    }
  }
}
