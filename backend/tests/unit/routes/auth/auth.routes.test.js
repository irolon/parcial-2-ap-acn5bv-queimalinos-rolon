import { describe, it, expect } from '@jest/globals';
import router from '../../../../src/routes/auth/auth.routes.js';
import {
  authenticate,
  authenticateForPasswordChange,
} from '../../../../src/shared/middlewares/auth.middleware.js';
import * as authController from '../../../../src/controllers/auth/auth.controller.js';
import * as profileController from '../../../../src/controllers/auth/profile.controller.js';

const layerOf = (path, method = 'post') =>
  router.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]);
const handlersOf = (path, method) => layerOf(path, method).route.stack.map((s) => s.handle);

describe('auth.routes', () => {
  it('POST /logout no exige access token (revoca con el refresh token del body)', () => {
    expect(handlersOf('/logout')).not.toContain(authenticate);
  });

  it('las rutas públicas de auth tampoco exigen access token', () => {
    for (const path of ['/register', '/login', '/refresh']) {
      expect(handlersOf(path)).not.toContain(authenticate);
    }
  });

  it('PUT /password: limitador primero, deja pasar con la clave blanqueada y valida el body (GX1)', () => {
    const handlers = handlersOf('/password', 'put');
    expect(handlers[0].rateLimit).toBe('passwordChange');
    expect(handlers[1]).toBe(authenticateForPasswordChange);
    expect(handlers).not.toContain(authenticate);
    expect(handlers[2].validates).toBe('body');
    expect(handlers.at(-1)).toBe(authController.changePassword);
  });
});

describe('auth.routes — /me (GX2)', () => {
  const res = { status: () => res, json: () => res };
  const roleRejects = (role, r) => {
    let err = 'sin llamar';
    role({ user: { role: r } }, res, (e) => {
      err = e;
    });
    return err;
  };

  it('GET /me: authenticate, solo trainer y getMe', () => {
    const [auth, role, handler] = handlersOf('/me', 'get');
    expect(auth).toBe(authenticate);
    expect(roleRejects(role, 'student')).toMatchObject({ statusCode: 403 });
    expect(roleRejects(role, 'trainer')).toBeUndefined();
    expect(handler).toBe(profileController.getMe);
  });

  it('PATCH /me: authenticate, solo trainer, valida el body y updateMe', () => {
    const [auth, role, body, handler] = handlersOf('/me', 'patch');
    expect(auth).toBe(authenticate);
    expect(roleRejects(role, 'student')).toMatchObject({ statusCode: 403 });
    expect(body.validates).toBe('body');
    expect(handler).toBe(profileController.updateMe);
  });
});
