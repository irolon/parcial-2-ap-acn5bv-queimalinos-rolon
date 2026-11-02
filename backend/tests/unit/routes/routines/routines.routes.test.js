import { describe, it, expect } from '@jest/globals';
import routinesRouter from '../../../../src/routes/routines/routines.routes.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';
import * as routinesController from '../../../../src/controllers/routines/routines.controller.js';

const ID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const res = { status: () => res, json: () => res };

/** Corre un middleware y devuelve lo que le pasó a next (undefined = siguió sin error). */
const run = (handler, req) => {
  let out = 'sin llamar';
  handler(req, res, (e) => { out = e; });
  return out;
};

describe('routines.routes — PUT /routines/:id/exercises/order', () => {
  const route = routinesRouter.stack.find((l) => l.route?.path === '/:id/exercises/order' && l.route.methods.put)?.route;

  it('existe y pasa por authenticate (router.use) antes que cualquier ruta', () => {
    expect(route).toBeDefined();
    const authIndex = routinesRouter.stack.findIndex((l) => !l.route && l.handle === authenticate);
    const routeIndex = routinesRouter.stack.findIndex((l) => l.route === route);
    expect(authIndex).toBeGreaterThanOrEqual(0);
    expect(authIndex).toBeLessThan(routeIndex);
  });

  it('solo trainer, valida :id y el body, y termina en reorderExercises', () => {
    const [role, params, body, handler] = route.stack.map((l) => l.handle);
    expect(run(role, { user: { role: 'student' } })).toMatchObject({ statusCode: 403 });
    expect(run(role, { user: { role: 'trainer' } })).toBeUndefined();

    expect(run(params, { params: { id: 'order' } })).toMatchObject({ statusCode: 400 });
    expect(run(params, { params: { id: ID } })).toBeUndefined();

    expect(run(body, { body: {} })).toMatchObject({ statusCode: 400 });
    expect(run(body, { body: { routine_exercise_ids: [OTHER, OTHER] } })).toMatchObject({ statusCode: 400 });
    expect(run(body, { body: { routine_exercise_ids: [ID, OTHER] } })).toBeUndefined();

    expect(handler).toBe(routinesController.reorderExercises);
  });
});
