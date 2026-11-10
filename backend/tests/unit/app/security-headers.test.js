import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { env } from '../../../src/config/env.js';
import { startServer } from '../../helpers/app/http.setup.js';

describe('helmet y CORS (createApp)', () => {
  let http;
  beforeAll(async () => {
    http = await startServer();
  });
  afterAll(() => http.stop());

  it('helmet pone CSP, nosniff y HSTS, y no hay X-Powered-By', async () => {
    const { status, headers } = await http.send('get', '/health');
    expect(status).toBe(200);
    expect(headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('strict-transport-security')).toMatch(/max-age=\d+/);
    expect(headers.get('x-powered-by')).toBeNull();
  });

  it('un Origin ajeno no recibe su propio origen en Access-Control-Allow-Origin', async () => {
    const { headers } = await http.send('get', '/health', { headers: { origin: 'https://evil.example' } });
    expect(headers.get('access-control-allow-origin')).not.toBe('https://evil.example');
    expect(headers.get('access-control-allow-origin')).toBe(env.FRONTEND_URL);
  });

  it('el Origin de FRONTEND_URL sí, con credenciales (también en el preflight)', async () => {
    const { status, headers } = await http.send('options', '/api/auth/login', {
      headers: { origin: env.FRONTEND_URL, 'access-control-request-method': 'POST' },
    });
    expect(status).toBe(204);
    expect(headers.get('access-control-allow-origin')).toBe(env.FRONTEND_URL);
    expect(headers.get('access-control-allow-credentials')).toBe('true');
  });
});
