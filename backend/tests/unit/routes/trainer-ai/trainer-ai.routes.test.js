import { describe, it, expect } from '@jest/globals';
import trainerAiRouter from '../../../../src/routes/trainer-ai/trainer-ai.routes.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';
import * as controller from '../../../../src/controllers/trainer-ai/trainer-ai.controller.js';
import { createApp } from '../../../../src/app.js';

const ID = '11111111-1111-4111-8111-111111111111';
const res = { status: () => res, json: () => res };

/** Corre un middleware y devuelve lo que le pasó a next (undefined = siguió sin error). */
const run = (handler, req) => {
  let out = 'sin llamar';
  handler(req, res, (e) => {
    out = e;
  });
  return out;
};
const routeOf = (path) => trainerAiRouter.stack.find((l) => l.route?.path === path && l.route.methods.post)?.route;

describe('trainer-ai.routes', () => {
  it('authenticate corre antes que las rutas', () => {
    const authIndex = trainerAiRouter.stack.findIndex((l) => !l.route && l.handle === authenticate);
    const firstRoute = trainerAiRouter.stack.findIndex((l) => l.route);
    expect(authIndex).toBeGreaterThanOrEqual(0);
    expect(authIndex).toBeLessThan(firstRoute);
  });

  it.each([
    ['/generate-routine', { frequency_per_week: 3, goal: 'strength', level: 'beginner' }, controller.generateRoutine],
    ['/save-as-template', { generation_id: ID, template_name: 'Fuerza' }, controller.saveAsTemplate],
  ])('POST %s: solo trainer, valida el body y termina en el controller', (path, body, expected) => {
    const route = routeOf(path);
    expect(route).toBeDefined();
    const [role, validate, handler] = route.stack.map((l) => l.handle);
    expect(run(role, { user: { role: 'student' } })).toMatchObject({ statusCode: 403 });
    expect(run(role, { user: { role: 'trainer' } })).toBeUndefined();
    expect(run(validate, { body: {} })).toMatchObject({ statusCode: 400 });
    expect(run(validate, { body })).toBeUndefined();
    expect(handler).toBe(expected);
  });

  it('está montado en /api/trainer-ai', () => {
    const app = createApp();
    const mounted = app._router.stack.some((l) => l.regexp?.test('/api/trainer-ai/generate-routine') && l.name === 'router');
    expect(mounted).toBe(true);
  });
});

describe('CORS del asistente', () => {
  it('expone Retry-After para que la web muestre la cuenta atrás del 429', async () => {
    const { default: request } = await import('supertest');
    const res = await request(createApp()).get('/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-expose-headers']).toMatch(/Retry-After/i);
  });
});
