import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { ACCOUNT, b64, fcm, mockEnv, publicKey, reply, tokenReply } from '../../../helpers/notifications/fcm.setup.js';

const MSG = { title: 'Hola', body: 'Mundo', data: { n: 5, ok: true } };

beforeEach(() => {
  fcm.__resetForTests();
  mockEnv.FCM_SERVICE_ACCOUNT_PATH = undefined;
  mockEnv.FCM_SERVICE_ACCOUNT_JSON = b64(ACCOUNT);
  global.fetch = jest.fn();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('loadServiceAccount / isFcmEnabled', () => {
  it('decodifica el base64 y habilita FCM', () => {
    expect(fcm.loadServiceAccount().project_id).toBe('proj-1');
    expect(fcm.isFcmEnabled()).toBe(true);
  });

  it('sin credenciales devuelve null y avisa una sola vez', () => {
    mockEnv.FCM_SERVICE_ACCOUNT_JSON = undefined;
    expect(fcm.loadServiceAccount()).toBeNull();
    expect(fcm.isFcmEnabled()).toBe(false);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn.mock.calls[0][0]).toContain('[notifications] FCM deshabilitado');
  });

  it('JSON inválido o sin campos requeridos: deshabilitado y sin filtrar la clave', () => {
    mockEnv.FCM_SERVICE_ACCOUNT_JSON = b64({ project_id: 'p', private_key: ACCOUNT.private_key });
    expect(fcm.loadServiceAccount()).toBeNull();
    expect(console.warn.mock.calls[0][0]).not.toContain('BEGIN PRIVATE KEY');
    fcm.__resetForTests();
    mockEnv.FCM_SERVICE_ACCOUNT_JSON = Buffer.from('no es json').toString('base64');
    expect(fcm.loadServiceAccount()).toBeNull();
  });
});

describe('getAccessToken', () => {
  it('firma un JWT RS256 y lo canjea por un access token', async () => {
    global.fetch.mockResolvedValue(tokenReply());
    expect(await fcm.getAccessToken()).toBe('at-1');
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    const params = new URLSearchParams(init.body);
    expect(params.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    const claims = jwt.verify(params.get('assertion'), publicKey, { algorithms: ['RS256'] });
    expect(claims).toMatchObject({
      iss: ACCOUNT.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
    });
    expect(claims.exp - claims.iat).toBe(3600);
  });

  it('cachea el token hasta 60 s antes de vencer', async () => {
    global.fetch.mockResolvedValue(tokenReply(3600));
    await fcm.getAccessToken();
    await fcm.getAccessToken();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('llamadas concurrentes con caché frío hacen un solo intercambio', async () => {
    global.fetch.mockResolvedValue(tokenReply());
    const tokens = await Promise.all([fcm.getAccessToken(), fcm.getAccessToken(), fcm.getAccessToken()]);
    expect(tokens).toEqual(['at-1', 'at-1', 'at-1']);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('con FCM deshabilitado lanza un error claro', async () => {
    mockEnv.FCM_SERVICE_ACCOUNT_JSON = undefined;
    await expect(fcm.getAccessToken()).rejects.toThrow('FCM deshabilitado');
  });

  it('renueva cuando faltan menos de 60 s', async () => {
    global.fetch.mockResolvedValue(tokenReply(30));
    await fcm.getAccessToken();
    await fcm.getAccessToken();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('sendToToken', () => {
  it('envía el mensaje con data en strings y prioridad alta', async () => {
    global.fetch.mockResolvedValueOnce(tokenReply()).mockResolvedValueOnce(reply(200));
    expect(await fcm.sendToToken('tok', MSG)).toEqual({ ok: true });
    const [url, init] = global.fetch.mock.calls[1];
    expect(url).toBe('https://fcm.googleapis.com/v1/projects/proj-1/messages:send');
    expect(init.headers.Authorization).toBe('Bearer at-1');
    expect(JSON.parse(init.body)).toEqual({
      validate_only: false,
      message: {
        token: 'tok',
        notification: { title: 'Hola', body: 'Mundo' },
        data: { n: '5', ok: 'true' },
        android: { priority: 'high' },
      },
    });
  });

  it('respeta validateOnly', async () => {
    global.fetch.mockResolvedValueOnce(tokenReply()).mockResolvedValueOnce(reply(200));
    await fcm.sendToToken('tok', MSG, { validateOnly: true });
    expect(JSON.parse(global.fetch.mock.calls[1][1].body).validate_only).toBe(true);
  });

  const unregistered = {
    error: {
      code: 404,
      message: 'Requested entity was not found.',
      status: 'NOT_FOUND',
      details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED' }],
    },
  };
  const badToken = {
    error: {
      code: 400,
      message: 'The registration token is not a valid FCM registration token',
      status: 'INVALID_ARGUMENT',
      details: [{ fieldViolations: [{ field: 'message.token', description: 'invalid' }] }],
    },
  };
  const badPayload = {
    error: { code: 400, message: 'Invalid value at message.data', status: 'INVALID_ARGUMENT' },
  };
  const notFound = { error: { code: 404, message: 'Requested entity was not found.', status: 'NOT_FOUND' } };

  it.each([
    ['UNREGISTERED (FcmError)', 404, unregistered, 'unregistered'],
    ['404 sin detalle UNREGISTERED (proyecto/API)', 404, notFound, 'other'],
    ['400 sobre message.token', 400, badToken, 'invalid'],
    ['400 por el payload', 400, badPayload, 'other'],
    ['500', 500, {}, 'other'],
  ])('clasifica %s', async (_n, status, body, reason) => {
    global.fetch.mockResolvedValueOnce(tokenReply()).mockResolvedValueOnce(reply(status, body));
    expect(await fcm.sendToToken('tok', MSG)).toEqual({ ok: false, reason, status });
  });

  it('data: omite null/undefined, serializa objetos y convierte primitivos', async () => {
    global.fetch.mockResolvedValueOnce(tokenReply()).mockResolvedValueOnce(reply(200));
    await fcm.sendToToken('tok', { ...MSG, data: { a: null, b: undefined, c: { x: 1 }, d: 7 } });
    expect(JSON.parse(global.fetch.mock.calls[1][1].body).message.data).toEqual({ c: '{"x":1}', d: '7' });
  });

  it('un timeout del fetch es reason other', async () => {
    global.fetch.mockResolvedValueOnce(tokenReply()).mockRejectedValueOnce(new DOMException('t', 'TimeoutError'));
    expect(await fcm.sendToToken('tok', MSG)).toEqual({ ok: false, reason: 'other' });
  });

  it('un error de red no lanza', async () => {
    global.fetch.mockResolvedValueOnce(tokenReply()).mockRejectedValueOnce(new Error('ECONNRESET'));
    expect(await fcm.sendToToken('tok', MSG)).toEqual({ ok: false, reason: 'other' });
  });

  it('un 401 descarta el access token cacheado', async () => {
    global.fetch
      .mockResolvedValueOnce(tokenReply(3600, 'at-1'))
      .mockResolvedValueOnce(reply(401))
      .mockResolvedValueOnce(tokenReply(3600, 'at-2'))
      .mockResolvedValueOnce(reply(200));
    await fcm.sendToToken('tok', MSG);
    await fcm.sendToToken('tok', MSG);
    expect(global.fetch.mock.calls[3][1].headers.Authorization).toBe('Bearer at-2');
  });
});
