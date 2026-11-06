import { env } from '../../config/env.js';
import { Errors } from '../../shared/utils/errors.js';

/** n8n + KIMI tardan; pasado este tiempo se corta y el PT arma la rutina a mano. */
export const WEBHOOK_TIMEOUT_MS = 30000;

/**
 * Llama al webhook `trainer-ia` de n8n con el contexto (sin datos personales) y devuelve
 * el JSON que respondió, sin validar. Sin URL configurada, por timeout, error de red o
 * respuesta no 2xx → 503 AI_UNAVAILABLE. Un 2xx que no es JSON → 502 AI_INVALID_RESPONSE.
 * Las variables se leen en cada llamada (la app arranca sin IA).
 */
export async function requestRoutineProposal(payload) {
  const url = env.N8N_TRAINER_AI_WEBHOOK_URL;
  if (!url) throw Errors.aiUnavailable();

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-webhook-secret': env.N8N_WEBHOOK_SECRET ?? '' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
  } catch (err) {
    console.error('[trainer-ai] n8n no respondió:', err.name, err.message);
    throw Errors.aiUnavailable();
  }
  if (!res.ok) {
    console.error('[trainer-ai] n8n respondió', res.status);
    throw Errors.aiUnavailable();
  }
  try {
    return await res.json();
  } catch {
    console.error('[trainer-ai] n8n respondió algo que no es JSON');
    throw Errors.aiInvalidResponse();
  }
}
