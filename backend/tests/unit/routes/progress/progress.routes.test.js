import { describe, it, expect } from '@jest/globals';
import router from '../../../../src/routes/progress/progress.routes.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';

const guards = router.stack.filter((layer) => !layer.route).map((layer) => layer.handle);
const routeOf = (path) => router.stack.find((l) => l.route?.path === path && l.route.methods.get);
const run = (handler, req) => {
  let err;
  handler(req, {}, (e) => { err = e; });
  return err;
};

describe('progress.routes', () => {
  it('exige authenticate y un middleware de rol antes de las rutas', () => {
    expect(guards).toHaveLength(2);
    expect(guards[0]).toBe(authenticate);
    expect(router.stack[0].route).toBeUndefined();
    expect(router.stack[1].route).toBeUndefined();
  });

  it('el rol exigido es trainer o student', () => {
    expect(run(guards[1], { user: { role: 'admin' } })).toMatchObject({ statusCode: 403 });
    expect(run(guards[1], { user: { role: 'student' } })).toBeUndefined();
    expect(run(guards[1], { user: { role: 'trainer' } })).toBeUndefined();
  });

  it('GET /exercise/:exerciseId valida params y query antes del controller', () => {
    const handlers = routeOf('/exercise/:exerciseId').route.stack.map((l) => l.handle);
    expect(handlers).toHaveLength(3);
    expect(run(handlers[0], { params: { exerciseId: 'x' } })).toMatchObject({ statusCode: 400 });
    const req = {
      params: { exerciseId: '44444444-4444-4444-8444-444444444444' },
      query: { from: '2026-02-30' },
    };
    expect(run(handlers[0], req)).toBeUndefined();
    expect(run(handlers[1], req)).toMatchObject({ statusCode: 400 });
  });

  it('GET /body/:studentId valida params antes del controller', () => {
    const handlers = routeOf('/body/:studentId').route.stack.map((l) => l.handle);
    expect(handlers).toHaveLength(2);
    expect(run(handlers[0], { params: { studentId: 'x' } })).toMatchObject({ statusCode: 400 });
  });
});
