import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Supabase falso: toda consulta vuelve vacía (la invitación no existe → 404), sin red.
const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));
const empty = () =>
  new Proxy({}, {
    get: (_t, m) => (m === 'then' ? (res) => res({ data: null, error: null }) : () => empty()),
  });
jest.unstable_mockModule(src('config/supabase.js'), () => ({
  supabase: { from: () => empty(), rpc: () => empty() },
}));
const { startServer } = await import('../../../helpers/app/http.setup.js');

const LIMITED = {
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Demasiados intentos. Probá de nuevo en unos minutos.',
    details: [],
  },
};
const rateLimits = { windowMs: 60_000, login: 10, auth: 2, public: 2 };
const login = (http, email) => http.send('post', '/api/auth/login', { json: { email } });

describe('rate limiting', () => {
  let http;
  beforeAll(async () => {
    http = await startServer({ rateLimits });
  });
  afterAll(() => http.stop());

  it('el 11.º login del mismo IP + email da 429 con Retry-After y el formato del contrato', async () => {
    for (let i = 0; i < 10; i += 1) expect((await login(http, 'Ana@Fit.test')).status).toBe(400);
    const res = await login(http, 'ana@fit.test');
    expect(res.status).toBe(429);
    expect(res.body).toEqual(LIMITED);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('otro email desde la misma IP no está limitado', async () => {
    expect((await login(http, 'otro@fit.test')).status).toBe(400);
  });

  it.each([
    ['post', '/api/auth/register', {}],
    ['post', '/api/auth/refresh', {}],
    ['get', '/api/invitations/abc', undefined],
    ['post', '/api/students', {}],
  ])('%s %s se limita por IP', async (method, path, json) => {
    for (let i = 0; i < 2; i += 1) expect((await http.send(method, path, { json })).status).not.toBe(429);
    const res = await http.send(method, path, { json });
    expect(res.status).toBe(429);
    expect(res.body).toEqual(LIMITED);
  });

  it('las rutas sin limitador no se tocan (logout)', async () => {
    for (let i = 0; i < 5; i += 1) {
      expect((await http.send('post', '/api/auth/logout', { json: {} })).status).toBe(400);
    }
  });
});

describe('createApp sin opciones', () => {
  it('usa los límites del env (en test, 100 veces más altos)', async () => {
    const http = await startServer();
    for (let i = 0; i < 12; i += 1) expect((await login(http, 'b@fit.test')).status).toBe(400);
    await http.stop();
  });
});
