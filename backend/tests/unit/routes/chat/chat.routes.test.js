import { describe, it, expect } from '@jest/globals';
import chatRouter from '../../../../src/routes/chat/chat.routes.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';
import * as controller from '../../../../src/controllers/chat/chat.controller.js';
import { createApp } from '../../../../src/app.js';

const res = { status: () => res, json: () => res };

/** Corre un middleware y devuelve lo que le pasó a next (undefined = siguió sin error). */
const run = (handler, req) => {
  let out = 'sin llamar';
  handler(req, res, (e) => {
    out = e;
  });
  return out;
};
const routeOf = (path, method) => chatRouter.stack.find((l) => l.route?.path === path && l.route.methods[method])?.route;

describe('chat.routes', () => {
  it('authenticate corre antes que las rutas', () => {
    const authIndex = chatRouter.stack.findIndex((l) => !l.route && l.handle === authenticate);
    const firstRoute = chatRouter.stack.findIndex((l) => l.route);
    expect(authIndex).toBeGreaterThanOrEqual(0);
    expect(authIndex).toBeLessThan(firstRoute);
  });

  it('POST /: solo alumno, valida el body y termina en el controller', () => {
    const route = routeOf('/', 'post');
    expect(route).toBeDefined();
    const [role, validate, handler] = route.stack.map((l) => l.handle);
    expect(run(role, { user: { role: 'trainer' } })).toMatchObject({ statusCode: 403 });
    expect(run(role, { user: { role: 'student' } })).toBeUndefined();
    expect(run(validate, { body: {} })).toMatchObject({ statusCode: 400 });
    expect(run(validate, { body: { message: 'hola' } })).toBeUndefined();
    expect(handler).toBe(controller.send);
  });

  it('GET /today: solo alumno y termina en el controller', () => {
    const route = routeOf('/today', 'get');
    expect(route).toBeDefined();
    const [role, handler] = route.stack.map((l) => l.handle);
    expect(run(role, { user: { role: 'trainer' } })).toMatchObject({ statusCode: 403 });
    expect(run(role, { user: { role: 'student' } })).toBeUndefined();
    expect(handler).toBe(controller.today);
  });

  it('GET /history: solo alumno, valida la query y termina en el controller', () => {
    const route = routeOf('/history', 'get');
    expect(route).toBeDefined();
    const [role, validate, handler] = route.stack.map((l) => l.handle);
    expect(run(role, { user: { role: 'trainer' } })).toMatchObject({ statusCode: 403 });
    expect(run(role, { user: { role: 'student' } })).toBeUndefined();
    expect(validate.validates).toBe('query');
    expect(run(validate, { query: { days: '15' } })).toMatchObject({ statusCode: 400 });
    expect(run(validate, { query: { before: '2026-11-05' } })).toBeUndefined();
    expect(handler).toBe(controller.history);
  });

  it('está montado en /api/chat', () => {
    const app = createApp();
    const mounted = app._router.stack.some((l) => l.regexp?.test('/api/chat/today') && l.name === 'router');
    expect(mounted).toBe(true);
  });
});
