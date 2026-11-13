import { jest } from '@jest/globals';
import {
  authenticate,
  authenticateForPasswordChange,
} from '../../../../../src/shared/middlewares/auth.middleware.js';
import * as again from '../../../../../src/shared/middlewares/auth.middleware.js';
import { signAccessToken, MUST_CHANGE_CLAIM } from '../../../../../src/shared/utils/jwt.js';

const USER = { sub: 'stu-1', role: 'student', email: 'ana@fittrainer.app' };

/** Corre el middleware con el header dado y devuelve lo que recibió next. */
function run(middleware, authorization) {
  const req = { headers: authorization ? { authorization } : {} };
  const next = jest.fn();
  middleware(req, {}, next);
  return { req, next, error: next.mock.calls[0][0] };
}

const bearer = (payload) => `Bearer ${signAccessToken(payload)}`;

describe('auth.middleware · cambio obligatorio de contraseña (GX1)', () => {
  it('el claim se llama must_change_password', () => {
    expect(MUST_CHANGE_CLAIM).toBe('must_change_password');
  });

  it('authenticate con el claim → 403 PASSWORD_CHANGE_REQUIRED', () => {
    const { error, req } = run(authenticate, bearer({ ...USER, must_change_password: true }));
    expect(error).toMatchObject({ statusCode: 403, code: 'PASSWORD_CHANGE_REQUIRED' });
    expect(req.user).toBeUndefined();
  });

  it('authenticateForPasswordChange deja pasar con el claim y arma req.user como siempre', () => {
    const { error, req } = run(
      authenticateForPasswordChange,
      bearer({ ...USER, must_change_password: true })
    );
    expect(error).toBeUndefined();
    expect(req.user).toEqual({ id: 'stu-1', role: 'student', email: 'ana@fittrainer.app' });
  });

  it.each([
    ['authenticate', authenticate],
    ['authenticateForPasswordChange', authenticateForPasswordChange],
  ])('%s sin el claim → next() sin error', (_name, middleware) => {
    const { error, req } = run(middleware, bearer(USER));
    expect(error).toBeUndefined();
    expect(req.user.id).toBe('stu-1');
  });

  it.each([
    ['authenticate', authenticate],
    ['authenticateForPasswordChange', authenticateForPasswordChange],
  ])('%s sin header o con token inválido → 401 como hoy', (_name, middleware) => {
    expect(run(middleware).error).toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' });
    expect(run(middleware, 'Bearer basura').error).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('authenticate es la misma referencia en cada import (los tests de rutas comparan con toBe)', () => {
    expect(again.authenticate).toBe(authenticate);
    expect(again.authenticateForPasswordChange).not.toBe(authenticate);
  });
});
