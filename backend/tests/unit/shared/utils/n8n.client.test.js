import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { env } from '../../../../src/config/env.js';
import { postToN8n } from '../../../../src/shared/utils/n8n.client.js';

const URL = 'http://n8n.test/webhook/student-ia';
const VAR = 'N8N_STUDENT_AI_WEBHOOK_URL';
const OPTIONS = { timeoutMs: 9000, tag: 'chat', unavailableMessage: 'Seguí entrenando.', invalidMessage: 'Respuesta rara.' };
const ORIGINAL = { url: env[VAR], secret: env.N8N_WEBHOOK_SECRET };
const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});
const post = (payload = { message: 'hola' }) => postToN8n(VAR, payload, OPTIONS);
const expect503 = (promise) =>
  expect(promise).rejects.toMatchObject({ statusCode: 503, code: 'AI_UNAVAILABLE', message: 'Seguí entrenando.' });

describe('shared · n8n.client · postToN8n (la URL sale de la variable que se pasa)', () => {
  let fetchMock;
  let errorLog;
  beforeEach(() => {
    env[VAR] = URL;
    env.N8N_WEBHOOK_SECRET = 'secreto';
    fetchMock = jest.spyOn(globalThis, 'fetch');
    errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    env[VAR] = ORIGINAL.url;
    env.N8N_WEBHOOK_SECRET = ORIGINAL.secret;
    fetchMock.mockRestore();
    errorLog.mockRestore();
  });

  it('hace POST a la URL de esa variable con el secreto compartido, el payload en JSON y el timeout pedido', async () => {
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue(reply(200, { response: 'ok' }));
    await expect(post({ message: 'hola' })).resolves.toEqual({ response: 'ok' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(URL);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'content-type': 'application/json', 'x-webhook-secret': 'secreto' });
    expect(JSON.parse(init.body)).toEqual({ message: 'hola' });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(timeout).toHaveBeenCalledWith(9000);
    timeout.mockRestore();
  });

  it('sin esa variable → 503 con el mensaje pedido, sin llamar a n8n y lo loguea con el tag y el nombre', async () => {
    env[VAR] = undefined;
    await expect503(post());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalledWith(expect.stringMatching(/^\[chat\].*N8N_STUDENT_AI_WEBHOOK_URL/));
  });

  it.each([undefined, ''])('sin secreto configurado (%p) → 503 sin llamar a n8n y lo loguea', async (secret) => {
    env.N8N_WEBHOOK_SECRET = secret;
    await expect503(post());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('N8N_WEBHOOK_SECRET'));
  });

  it('timeout (AbortSignal.timeout) → 503', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
    await expect503(post());
  });

  it('error de red → 503', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect503(post());
  });

  it.each([500, 502, 401, 404])('n8n responde %i → 503', async (status) => {
    fetchMock.mockResolvedValue(reply(status, { error: 'LLM_UNAVAILABLE' }));
    await expect503(post());
  });

  it('un 2xx que no es JSON → 502 AI_INVALID_RESPONSE con el mensaje pedido', async () => {
    fetchMock.mockResolvedValue(reply(200, '<html>'));
    await expect(post()).rejects.toMatchObject({ statusCode: 502, code: 'AI_INVALID_RESPONSE', message: 'Respuesta rara.' });
  });

  it.each([
    ['se corta la conexión', new TypeError('terminated')],
    ['vence el timeout', new DOMException('The operation was aborted due to timeout', 'TimeoutError')],
  ])('si al leer el body %s → 503 (no 502)', async (_label, err) => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => Promise.reject(err) });
    await expect503(post());
  });

  it('un 2xx con body vacío → 502 AI_INVALID_RESPONSE', async () => {
    fetchMock.mockResolvedValue(reply(200, ''));
    await expect(post()).rejects.toMatchObject({ statusCode: 502, code: 'AI_INVALID_RESPONSE' });
  });
});
