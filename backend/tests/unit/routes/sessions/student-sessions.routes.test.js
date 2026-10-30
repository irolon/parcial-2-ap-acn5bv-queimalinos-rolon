import { describe, it, expect } from '@jest/globals';
import router from '../../../../src/routes/sessions/student-sessions.routes.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';

const guards = router.stack.filter((l) => !l.route).map((l) => l.handle);
const routeOf = (path) => router.stack.find((l) => l.route?.path === path && l.route.methods.get);

describe('student-sessions.routes', () => {
  it('exige authenticate y rol trainer/student antes de las rutas', () => {
    expect(guards).toHaveLength(2);
    expect(guards[0]).toBe(authenticate);
    const res = { status: () => res, json: () => res };
    let err;
    guards[1]({ user: { role: 'admin' } }, res, (e) => { err = e; });
    expect(err).toMatchObject({ statusCode: 403 });
    for (const role of ['trainer', 'student']) {
      err = undefined;
      guards[1]({ user: { role } }, res, (e) => { err = e; });
      expect(err).toBeUndefined();
    }
  });

  it('expone GET / y GET /:sessionId con validación previa al controller', () => {
    expect(routeOf('/').route.stack).toHaveLength(3);
    expect(routeOf('/:sessionId').route.stack).toHaveLength(2);
  });
});
