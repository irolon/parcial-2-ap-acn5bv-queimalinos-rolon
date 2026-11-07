import { env } from '../../config/env.js';
import { Errors } from '../../shared/utils/errors.js';

/** n8n + KIMI tardan; pasado este tiempo se corta y el PT arma la rutina a mano. */
export const WEBHOOK_TIMEOUT_MS = 30000;

/**
 * Llama a un webhook de n8n y devuelve el JSON que respondió, sin validar. `urlVar` es el
 * nombre de la variable de entorno con la URL (cada asistente tiene su workflow); el secreto
 * es el compartido `N8N_WEBHOOK_SECRET`. Sin URL o sin secreto (no se llama a n8n), por
 * timeout, error de red o respuesta no 2xx → 503 AI_UNAVAILABLE. Un 2xx que no es JSON →
 * 502 AI_INVALID_RESPONSE. Las variables se leen en cada llamada (la app arranca sin IA).
 * Lo usan el asistente del entrenador y el chat del alumno.
 */
export async function postToN8n(urlVar, payload, { timeoutMs, tag, unavailableMessage, invalidMessage }) {
  const unavailable = () => Errors.aiUnavailable(unavailableMessage);
  const url = env[urlVar];
  const secret = env.N8N_WEBHOOK_SECRET;
  for (const [name, value] of [[urlVar, url], ['N8N_WEBHOOK_SECRET', secret]]) {
    if (!value) {
      console.error(`[${tag}] falta ${name}: el asistente IA queda deshabilitado`);
      throw unavailable();
    }
  }

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-webhook-secret': secret },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    console.error(`[${tag}] n8n no respondió:`, err.name, err.message);
    throw unavailable();
  }
  if (!res.ok) {
    console.error(`[${tag}] n8n respondió`, res.status);
    throw unavailable();
  }
  try {
    return await res.json();
  } catch {
    console.error(`[${tag}] n8n respondió algo que no es JSON`);
    throw Errors.aiInvalidResponse(invalidMessage);
  }
}

/** Webhook `trainer-ia`: propuesta de rutina para el PT, con timeout de 30 s. */
export const requestRoutineProposal = (payload) =>
  postToN8n('N8N_TRAINER_AI_WEBHOOK_URL', payload, { timeoutMs: WEBHOOK_TIMEOUT_MS, tag: 'trainer-ai' });
