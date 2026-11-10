import jwt from 'jsonwebtoken';
import { env } from '../../../../src/config/env.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';

const PAYLOAD = { sub: 'user-1', role: 'trainer', email: 'pt@mail.com' };

/** Corre el middleware con el header dado y devuelve { req, err } (lo que recibió next). */
function run(authorization) {
  const req = { headers: authorization === undefined ? {} : { authorization } };
  let err;
  authenticate(req, {}, (e) => {
    err = e;
  });
  return { req, err };
}

const expectUnauthorized = (err) =>
  expect(err).toEqual(expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }));

describe('authenticate', () => {
  it('con un token válido adjunta req.user y sigue sin error', () => {
    const token = jwt.sign(PAYLOAD, env.JWT_SECRET, { expiresIn: '1h' });
    const { req, err } = run(`Bearer ${token}`);
    expect(err).toBeUndefined();
    expect(req.user).toEqual({ id: 'user-1', role: 'trainer', email: 'pt@mail.com' });
  });

  it('rechaza un JWT expirado con 401 UNAUTHORIZED', () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    const token = jwt.sign({ ...PAYLOAD, exp }, env.JWT_SECRET);
    const { req, err } = run(`Bearer ${token}`);
    expectUnauthorized(err);
    expect(err.message).toBe('Token inválido o expirado');
    expect(req.user).toBeUndefined();
  });

  it('rechaza un JWT firmado con otro secreto', () => {
    const token = jwt.sign(PAYLOAD, 'otro-secreto-de-al-menos-32-caracteres!!', {
      expiresIn: '1h',
    });
    expectUnauthorized(run(`Bearer ${token}`).err);
  });

  it.each([undefined, '', 'Bearer', 'Basic abc'])('sin Bearer válido (%p) → 401', (header) => {
    const { err } = run(header);
    expectUnauthorized(err);
    expect(err.message).toBe('Falta el token de autenticación');
  });
});
