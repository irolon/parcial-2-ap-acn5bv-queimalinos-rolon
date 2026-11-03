import { describe, it, expect } from '@jest/globals';
import router from '../../../../../src/routes/messages/messages.routes.js';
import { authenticate } from '../../../../../src/shared/middlewares/auth.middleware.js';
import { parseImageUpload } from '../../../../../src/shared/middlewares/upload.middleware.js';

const layers = router.stack.filter((l) => l.route);
const find = (path, method) => layers.find((l) => l.route.path === path && l.route.methods[method]);
const res = { status: () => res, json: () => res };
const roleResult = (handlers, role) => {
  let err;
  handlers[1]({ user: { role } }, res, (e) => { err = e; });
  return err;
};

describe.each([
  ['/conversations', 'get', true],
  ['/unread-count', 'get', false],
  ['/broadcast', 'post', true],
  ['/:studentId', 'get', false],
  ['/:studentId', 'post', false],
  ['/:studentId/read', 'post', false],
])('%s [%s]', (path, method, trainerOnly) => {
  const layer = find(path, method);

  it('está definida y exige authenticate', () => {
    expect(layer).toBeDefined();
    expect(layer.route.stack[0].handle).toBe(authenticate);
  });

  it(trainerOnly ? 'solo trainer' : 'trainer y student', () => {
    const handlers = layer.route.stack.map((l) => l.handle);
    expect(roleResult(handlers, 'admin')).toMatchObject({ statusCode: 403 });
    expect(roleResult(handlers, 'trainer')).toBeUndefined();
    if (trainerOnly) expect(roleResult(handlers, 'student')).toMatchObject({ statusCode: 403 });
    else expect(roleResult(handlers, 'student')).toBeUndefined();
  });
});

describe('orden', () => {
  it('las rutas fijas se declaran antes que /:studentId', () => {
    const order = layers.map((l) => `${Object.keys(l.route.methods)[0]} ${l.route.path}`);
    const param = order.indexOf('get /:studentId');
    for (const fixed of ['get /conversations', 'get /unread-count']) {
      expect(order.indexOf(fixed)).toBeLessThan(param);
    }
    expect(order.indexOf('post /broadcast')).toBeLessThan(order.indexOf('post /:studentId'));
  });

  it('parseImageUpload corre antes de validar el body de POST /:studentId', () => {
    const handlers = find('/:studentId', 'post').route.stack.map((l) => l.handle);
    const upload = handlers.indexOf(parseImageUpload);
    expect(upload).toBeGreaterThan(-1);
    // authenticate, requireRole, validate(params), parseImageUpload, validate(body), controller
    expect(handlers).toHaveLength(6);
    expect(upload).toBe(3);
  });
});

describe('montaje en app', () => {
  it('app.js monta /api/messages', async () => {
    const { readFileSync } = await import('node:fs');
    const app = readFileSync(new URL('../../../../../src/app.js', import.meta.url), 'utf8');
    expect(app).toContain("app.use('/api/messages', messagesRoutes)");
  });
});
