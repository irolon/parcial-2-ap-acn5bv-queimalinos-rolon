import { describe, it, expect } from '@jest/globals';
import router from '../../../../src/routes/sessions/sessions.routes.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';

// router.use(authenticate, requireRole('student')) va primero en el stack.
const guards = router.stack.filter((layer) => !layer.route).map((layer) => layer.handle);
const routeOf = (method, path) =>
  router.stack.find((l) => l.route?.path === path && l.route.methods[method]);

describe('sessions.routes', () => {
  it('toda la ruta exige authenticate y un middleware de rol, antes de las rutas', () => {
    expect(guards).toHaveLength(2);
    expect(guards[0]).toBe(authenticate);
    expect(router.stack[0].route).toBeUndefined();
    expect(router.stack[1].route).toBeUndefined();
  });

  it('el rol exigido es student', () => {
    const res = { status: () => res, json: () => res };
    let err;
    guards[1]({ user: { role: 'trainer' } }, res, (e) => { err = e; });
    expect(err).toMatchObject({ statusCode: 403 });
    err = undefined;
    guards[1]({ user: { role: 'student' } }, res, (e) => { err = e; });
    expect(err).toBeUndefined();
  });

  it('expone POST /, PATCH /:id y POST /:id/sets', () => {
    expect(routeOf('post', '/')).toBeDefined();
    expect(routeOf('patch', '/:id')).toBeDefined();
    expect(routeOf('post', '/:id/sets')).toBeDefined();
  });
});
