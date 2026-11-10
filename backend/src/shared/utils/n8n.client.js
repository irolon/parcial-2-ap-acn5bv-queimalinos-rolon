import { env } from '../../config/env.js';
import { Errors } from './errors.js';

/**
 * Llama a un webhook de n8n y devuelve el JSON que respondió, sin validar. `urlVar` es el
 * nombre de la variable de entorno con la URL (cada asistente tiene su workflow); el secreto
 * es el compartido `N8N_WEBHOOK_SECRET`. Sin URL o sin secreto (no se llama a n8n), por
 * timeout, error de red (también mientras se lee el body) o respuesta no 2xx → 503
 * AI_UNAVAILABLE. Un 2xx cuyo body no es JSON → 502 AI_INVALID_RESPONSE. Las variables se leen en cada llamada (la app arranca sin IA).
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

  let body;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-webhook-secret': secret },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.error(`[${tag}] n8n respondió`, res.status);
      throw unavailable();
    }
    // La lectura del body es transporte: un corte o el timeout acá también es 503.
    body = await res.text();
  } catch (err) {
    if (err.code === 'AI_UNAVAILABLE') throw err;
    console.error(`[${tag}] n8n no respondió:`, err.name, err.message);
    throw unavailable();
  }
  try {
    return JSON.parse(body);
  } catch {
    console.error(`[${tag}] n8n respondió algo que no es JSON`);
    throw Errors.aiInvalidResponse(invalidMessage);
  }
}
