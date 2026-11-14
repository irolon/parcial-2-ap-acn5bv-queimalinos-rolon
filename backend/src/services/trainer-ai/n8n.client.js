import { postToN8n } from '../../shared/utils/n8n.client.js';

/** n8n + KIMI tardan; pasado este tiempo se corta y el PT arma la rutina a mano. */
export const WEBHOOK_TIMEOUT_MS = 38000;

/** Webhook `trainer-ia`: propuesta de rutina para el PT, con timeout de 38 s (n8n corta a los 36 s y el celular espera 40 s). */
export const requestRoutineProposal = (payload) =>
  postToN8n('N8N_TRAINER_AI_WEBHOOK_URL', payload, { timeoutMs: WEBHOOK_TIMEOUT_MS, tag: 'trainer-ai' });
