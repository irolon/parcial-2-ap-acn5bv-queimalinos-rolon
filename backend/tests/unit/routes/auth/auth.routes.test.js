import { describe, it, expect } from '@jest/globals';
import router from '../../../../src/routes/auth/auth.routes.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';

const handlersOf = (path) =>
  router.stack.find((layer) => layer.route?.path === path).route.stack.map((s) => s.handle);

describe('auth.routes', () => {
  it('POST /logout no exige access token (revoca con el refresh token del body)', () => {
    expect(handlersOf('/logout')).not.toContain(authenticate);
  });

  it('las rutas públicas de auth tampoco exigen access token', () => {
    for (const path of ['/register', '/login', '/refresh']) {
      expect(handlersOf(path)).not.toContain(authenticate);
    }
  });
});
