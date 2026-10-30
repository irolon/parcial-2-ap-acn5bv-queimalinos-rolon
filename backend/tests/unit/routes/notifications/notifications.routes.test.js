import { describe, it, expect } from '@jest/globals';
import router from '../../../../src/routes/notifications/notifications.routes.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';

const layers = router.stack.filter((l) => l.route);
const find = (path, method) => layers.find((l) => l.route.path === path && l.route.methods[method]);
const res = { status: () => res, json: () => res };
const roleResult = (handlers, role) => {
  let err;
  handlers[1]({ user: { role } }, res, (e) => { err = e; });
  return err;
};

describe.each([
  ['/', 'get'],
  ['/read-all', 'patch'],
  ['/:id/read', 'patch'],
  ['/tokens', 'post'],
  ['/tokens/:token', 'delete'],
])('%s [%s]', (path, method) => {
  const layer = find(path, method);

  it('está definida', () => {
    expect(layer).toBeDefined();
  });

  it('exige authenticate y rol trainer o student', () => {
    const handlers = layer.route.stack.map((l) => l.handle);
    expect(handlers[0]).toBe(authenticate);
    expect(roleResult(handlers, 'admin')).toMatchObject({ statusCode: 403 });
    expect(roleResult(handlers, 'trainer')).toBeUndefined();
    expect(roleResult(handlers, 'student')).toBeUndefined();
  });
});

describe('validación', () => {
  it.each([['/:id/read', 'patch'], ['/tokens', 'post'], ['/tokens/:token', 'delete']])(
    '%s [%s] pasa por el middleware de validación',
    (path, method) => {
      // authenticate, requireRole, validate y controller
      expect(find(path, method).route.stack).toHaveLength(4);
    }
  );
});

describe('orden de rutas', () => {
  it('/read-all se define antes que /:id/read', () => {
    const paths = layers.map((l) => l.route.path);
    expect(paths.indexOf('/read-all')).toBeLessThan(paths.indexOf('/:id/read'));
  });
});

describe('montaje en app', () => {
  it('app.js monta /api/notifications', async () => {
    const { readFileSync } = await import('node:fs');
    const app = readFileSync(new URL('../../../../src/app.js', import.meta.url), 'utf8');
    expect(app).toContain("app.use('/api/notifications', notificationsRoutes)");
  });
});
