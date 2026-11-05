import { describe, expect, it } from '@jest/globals';
import appointmentsRouter from '../../../../../src/routes/agenda/appointments.routes.js';
import { createApp } from '../../../../../src/app.js';
import { authenticate } from '../../../../../src/shared/middlewares/auth.middleware.js';

const layers = (router) => router.stack.filter((l) => l.route);
const find = (router, path, method) => layers(router).find((l) => l.route.path === path && l.route.methods[method]);
const res = { status: () => res, json: () => res };
const roleError = (layer, role) => {
  let err;
  layer.route.stack[1].handle({ user: { role } }, res, (e) => { err = e; });
  return err;
};

describe.each([
  ['GET /appointments', '/', 'get'],
  ['POST /appointments', '/', 'post'],
  ['PATCH /appointments/:id', '/:id', 'patch'],
])('%s', (_name, path, method) => {
  const layer = find(appointmentsRouter, path, method);

  it('exige authenticate y un rol válido', () => {
    expect(layer.route.stack[0].handle).toBe(authenticate);
    expect(roleError(layer, 'admin')).toMatchObject({ statusCode: 403 });
    expect(roleError(layer, 'trainer')).toBeUndefined();
    expect(roleError(layer, 'student')).toBeUndefined();
  });
});

describe('montaje', () => {
  it('createApp monta /api/appointments', () => {
    const app = createApp();
    const stack = app._router?.stack ?? app.router.stack;
    expect(stack.some((l) => l.handle === appointmentsRouter)).toBe(true);
  });
});
