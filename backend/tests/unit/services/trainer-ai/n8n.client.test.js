import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { env } from '../../../../src/config/env.js';
import { requestRoutineProposal, WEBHOOK_TIMEOUT_MS } from '../../../../src/services/trainer-ai/n8n.client.js';

const URL = 'http://n8n.test/webhook/trainer-ia';
const PAYLOAD = { params: { goal: 'strength' }, library: [], previous_templates: [], base_template: null };
const ORIGINAL = { url: env.N8N_TRAINER_AI_WEBHOOK_URL, secret: env.N8N_WEBHOOK_SECRET };
const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});
const expect503 = (promise) =>
  expect(promise).rejects.toMatchObject({ statusCode: 503, code: 'AI_UNAVAILABLE' });

describe('trainer-ai · n8n.client', () => {
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

  it('hace POST a la URL con el secreto en x-webhook-secret, el payload en JSON y timeout de 30 s', async () => {
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue(reply(200, { routines: [] }));
    await expect(requestRoutineProposal(PAYLOAD)).resolves.toEqual({ routines: [] });

    expect(WEBHOOK_TIMEOUT_MS).toBe(30000);
    expect(timeout).toHaveBeenCalledWith(30000);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(URL);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'content-type': 'application/json', 'x-webhook-secret': 'secreto' });
    expect(JSON.parse(init.body)).toEqual(PAYLOAD);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    timeout.mockRestore();
  });

  it('sin URL configurada responde 503 sin llamar a n8n y lo loguea', async () => {
    env.N8N_TRAINER_AI_WEBHOOK_URL = undefined;
    await expect503(requestRoutineProposal(PAYLOAD));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('N8N_TRAINER_AI_WEBHOOK_URL'));
  });

  it('timeout (AbortSignal.timeout) → 503', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
    await expect503(requestRoutineProposal(PAYLOAD));
  });

  it('error de red → 503', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect503(requestRoutineProposal(PAYLOAD));
  });

  it.each([500, 502, 401, 404])('n8n responde %i → 503', async (status) => {
    fetchMock.mockResolvedValue(reply(status, { error: 'LLM_UNAVAILABLE' }));
    await expect503(requestRoutineProposal(PAYLOAD));
  });

  it('un 2xx que no es JSON → 502 AI_INVALID_RESPONSE', async () => {
    fetchMock.mockResolvedValue(reply(200, '<html>'));
    await expect(requestRoutineProposal(PAYLOAD)).rejects.toMatchObject({
      statusCode: 502,
      code: 'AI_INVALID_RESPONSE',
    });
  });

  it.each([
    ['se corta la conexión', new TypeError('terminated')],
    ['vence el timeout', new DOMException('The operation was aborted due to timeout', 'TimeoutError')],
  ])('si al leer el body %s → 503 (no 502)', async (_label, err) => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => Promise.reject(err) });
    await expect503(requestRoutineProposal(PAYLOAD));
  });

  it('un 2xx con body vacío → 502 AI_INVALID_RESPONSE', async () => {
    fetchMock.mockResolvedValue(reply(200, ''));
    await expect(requestRoutineProposal(PAYLOAD)).rejects.toMatchObject({ statusCode: 502 });
  });

  it.each([undefined, ''])('sin secreto configurado (%p) responde 503 sin llamar a n8n y lo loguea', async (secret) => {
    env.N8N_WEBHOOK_SECRET = secret;
    await expect503(requestRoutineProposal(PAYLOAD));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('N8N_WEBHOOK_SECRET'));
  });
});
