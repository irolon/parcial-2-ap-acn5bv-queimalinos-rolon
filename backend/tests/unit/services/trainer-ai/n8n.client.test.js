import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { env } from '../../../../src/config/env.js';
import { requestRoutineProposal, WEBHOOK_TIMEOUT_MS } from '../../../../src/services/trainer-ai/n8n.client.js';

// El comportamiento genérico (secreto, timeout, 5xx, no JSON) está en tests/unit/shared/utils/n8n.client.test.js.
const URL = 'http://n8n.test/webhook/trainer-ia';
const PAYLOAD = { params: { goal: 'strength' }, library: [], previous_templates: [], base_template: null };
const ORIGINAL = { url: env.N8N_TRAINER_AI_WEBHOOK_URL, secret: env.N8N_WEBHOOK_SECRET };

describe('trainer-ai · n8n.client · requestRoutineProposal', () => {
  let fetchMock;
  let errorLog;
  beforeEach(() => {
    env.N8N_TRAINER_AI_WEBHOOK_URL = URL;
    env.N8N_WEBHOOK_SECRET = 'secreto';
    fetchMock = jest.spyOn(globalThis, 'fetch');
    errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    env.N8N_TRAINER_AI_WEBHOOK_URL = ORIGINAL.url;
    env.N8N_WEBHOOK_SECRET = ORIGINAL.secret;
    fetchMock.mockRestore();
    errorLog.mockRestore();
  });

  it('hace POST al webhook trainer-ia con el secreto, el payload en JSON y timeout de 38 s (n8n corta a los 36 y el celular espera 40)', async () => {
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ routines: [] }) });
    await expect(requestRoutineProposal(PAYLOAD)).resolves.toEqual({ routines: [] });

    expect(WEBHOOK_TIMEOUT_MS).toBe(38000);
    expect(timeout).toHaveBeenCalledWith(38000);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(URL);
    expect(init.headers['x-webhook-secret']).toBe('secreto');
    expect(JSON.parse(init.body)).toEqual(PAYLOAD);
    timeout.mockRestore();
  });

  it('sin URL configurada responde 503 AI_UNAVAILABLE sin llamar a n8n y lo loguea con el tag trainer-ai', async () => {
    env.N8N_TRAINER_AI_WEBHOOK_URL = undefined;
    await expect(requestRoutineProposal(PAYLOAD)).rejects.toMatchObject({ statusCode: 503, code: 'AI_UNAVAILABLE' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalledWith(expect.stringMatching(/^\[trainer-ai\].*N8N_TRAINER_AI_WEBHOOK_URL/));
  });
});
