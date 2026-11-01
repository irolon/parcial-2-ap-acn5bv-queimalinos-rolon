import { describe, expect, it } from '@jest/globals';
import availabilityRouter from '../../../../src/routes/agenda/availability.routes.js';
import appointmentsRouter from '../../../../src/routes/agenda/appointments.routes.js';
import { createApp } from '../../../../src/app.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';

const layers = (router) => router.stack.filter((l) => l.route);
const find = (router, path, method) => layers(router).find((l) => l.route.path === path && l.route.methods[method]);
const res = { status: () => res, json: () => res };
const roleError = (layer, role) => {
  let err;
  layer.route.stack[1].handle({ user: { role } }, res, (e) => { err = e; });
  return err;
};

describe.each([
  ['GET /availability', availabilityRouter, '/', 'get', 'trainer'],
  ['PUT /availability', availabilityRouter, '/', 'put', 'trainer'],
  ['GET /availability/free', availabilityRouter, '/free', 'get', null],
  ['GET /appointments', appointmentsRouter, '/', 'get', null],
  ['POST /appointments', appointmentsRouter, '/', 'post', null],
  ['PATCH /appointments/:id', appointmentsRouter, '/:id', 'patch', null],
])('%s', (_name, router, path, method, onlyRole) => {
  const layer = find(router, path, method);

  it('exige authenticate y un rol válido', () => {
    expect(layer.route.stack[0].handle).toBe(authenticate);
    expect(roleError(layer, 'admin')).toMatchObject({ statusCode: 403 });
    expect(roleError(layer, 'trainer')).toBeUndefined();
    expect(roleError(layer, 'student') === undefined).toBe(onlyRole === null);
  });
});

describe('orden y montaje', () => {
  it('/free se define antes que cualquier ruta paramétrica', () => {
    const paths = layers(availabilityRouter).map((l) => l.route.path);
    expect(paths.indexOf('/free')).toBe(0);
  });

  it('createApp monta /api/availability y /api/appointments', () => {
    const app = createApp();
    const stack = app._router?.stack ?? app.router.stack;
    expect(stack.some((l) => l.handle === availabilityRouter)).toBe(true);
    expect(stack.some((l) => l.handle === appointmentsRouter)).toBe(true);
  });
});
