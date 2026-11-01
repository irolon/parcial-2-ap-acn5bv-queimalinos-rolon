import { describe, expect, it } from '@jest/globals';
import availabilityRouter from '../../../../../src/routes/agenda/availability.routes.js';
import { createApp } from '../../../../../src/app.js';
import { authenticate } from '../../../../../src/shared/middlewares/auth.middleware.js';

const layers = (router) => router.stack.filter((l) => l.route);
const find = (path, method) => layers(availabilityRouter).find((l) => l.route.path === path && l.route.methods[method]);
const res = { status: () => res, json: () => res };
const roleError = (layer, role) => {
  let err;
  layer.route.stack[1].handle({ user: { role } }, res, (e) => { err = e; });
  return err;
};

describe.each([
  ['GET /availability', '/', 'get', 'trainer'],
  ['PUT /availability', '/', 'put', 'trainer'],
  ['GET /availability/free', '/free', 'get', null],
])('%s: middlewares', (_name, path, method, onlyRole) => {
  const layer = find(path, method);

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

  it('createApp monta /api/availability', () => {
    const app = createApp();
    const stack = app._router?.stack ?? app.router.stack;
    expect(stack.some((l) => l.handle === availabilityRouter)).toBe(true);
  });
});
