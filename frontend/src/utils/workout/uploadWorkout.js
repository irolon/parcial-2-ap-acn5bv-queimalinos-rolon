import {
  applyBatch, applySession, batches, pendingSets, resetSession, sessionBody, setBody,
} from './uploadPayload';

const isObject = (value) => typeof value === 'object' && value !== null;

const failure = (code, message) => Object.assign(new Error(message), { code });

/** Sin red, timeout, 5xx o 429 (o algo que no es HTTP, como una respuesta ilegible) se puede reintentar; otro 4xx, no. */
const isRetryable = (status) => status === null || status === 0 || status >= 500 || status === 408 || status === 429;

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
 * @returns {Promise<{ ok: boolean, state, failed: {id, code}[], unlocked: object[], error?: { status, code, message, retryable } }>}
 */
export async function uploadWorkout({ api, state, onState = () => {} }) {
  let current = state;
  const commit = (next) => {
    current = next;
    onState(next);
  };
  let recreated = false;
  while (true) {
    let step = 'session';
    try {
      if (!current.upload.sessionCreated) {
        const data = await api.createSession(sessionBody(current));
        if (!isObject(data)) throw failure('BAD_RESPONSE', 'El servidor respondió sin la sesión');
        commit(applySession(current, data));
      }
      step = 'sets';
      for (const batch of batches(pendingSets(current))) {
        const data = await api.uploadSets(current.id, batch.map(setBody));
        if (!isObject(data)) throw failure('BAD_RESPONSE', 'El servidor respondió sin el resultado del lote');
        commit(applyBatch(current, batch, data));
      }
      if (pendingSets(current).length > 0) throw failure('INCOMPLETE', 'El servidor no confirmó todas las series');
      return outcome(current, { ok: true });
    } catch (err) {
      const sessionGone = step === 'sets' && err?.status === 404;
      if (!sessionGone || recreated) return outcome(current, { ok: false, error: describe(err) });
      recreated = true;
      commit(resetSession(current));
    }
  }
}
