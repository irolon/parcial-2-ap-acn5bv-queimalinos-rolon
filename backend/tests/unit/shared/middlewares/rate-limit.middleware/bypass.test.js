import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { LIMITED, createApp, listen, login } from '../../../../helpers/shared/rate-limit.setup.js';
import { loginKey } from '../../../../../src/shared/middlewares/rate-limit.middleware.js';

const rateLimits = { windowMs: 60_000, login: 2, loginIp: 50, auth: 2, public: 2 };

// Express le pasa '/api/auth//login' al router de /api/auth como '/login': el limitador tiene que
// ir en la cadena del endpoint, no en una ruta exacta de la app.
describe('la doble barra no esquiva el limitador', () => {
  let http;
  beforeAll(async () => {
    http = await listen(createApp({ rateLimits }));
  });
  afterAll(() => http.stop());

  it.each([
    ['post', '/api/auth//login', { email: 'ana@fit.test' }],
    ['post', '/api/auth//register', {}],
    ['post', '/api/auth//refresh', {}],
    ['get', '/api/invitations//abc', undefined],
    ['post', '/api/students//', {}],
  ])('%s %s da 429 al pasarse del cupo', async (method, path, json) => {
    for (let i = 0; i < 2; i += 1) expect((await http.send(method, path, { json })).status).not.toBe(429);
    const res = await http.send(method, path, { json });
    expect(res.status).toBe(429);
    expect(res.body).toEqual(LIMITED);
  });

  it('la ruta con barra simple comparte el contador con la de doble barra', async () => {
    expect((await login(http, 'ana@fit.test')).status).toBe(429);
  });
});

describe('memoria del limitador del login', () => {
  let app;
  let http;
  beforeAll(async () => {
    app = createApp({ rateLimits: { ...rateLimits, login: 10, loginIp: 2 }, trustProxy: 1 });
    http = await listen(app);
  });
  afterAll(() => http.stop());

  it('con la IP bloqueada, un email nuevo no crea una clave IP + email', async () => {
    const ip = '198.51.100.9';
    for (let i = 0; i < 2; i += 1) expect((await login(http, `u${i}@fit.test`, ip)).status).toBe(400);
    expect((await login(http, 'nuevo@fit.test', ip)).status).toBe(429);
    const [, byIpAndEmail] = app.locals.rateLimiters.login;
    expect(await byIpAndEmail.getKey(`${ip}|nuevo@fit.test`)).toBeUndefined();
    expect(await byIpAndEmail.getKey(`${ip}|u0@fit.test`)).toBeDefined();
  });

  it('la clave IP + email acota el email a 254 caracteres', () => {
    const req = { ip: '203.0.113.5', body: { email: `  ${'A'.repeat(100_000)}@FIT.test ` } };
    expect(loginKey(req)).toBe(`203.0.113.5|${'a'.repeat(254)}`);
  });

  it('un email que no es string usa la clave de la IP sola', () => {
    expect(loginKey({ ip: '203.0.113.5', body: { email: ['x'] } })).toBe('203.0.113.5|');
  });
});
