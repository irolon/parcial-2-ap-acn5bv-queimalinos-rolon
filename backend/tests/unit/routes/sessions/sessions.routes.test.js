import { describe, it, expect } from '@jest/globals';
import router from '../../../../src/routes/sessions/sessions.routes.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';

const routeOf = (method, path) =>
  router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
const handlersOf = (method, path) => routeOf(method, path).route.stack.map((l) => l.handle);
const res = { status: () => res, json: () => res };
// El primer handler de cada ruta es requireRole(...) (authenticate es global): lo ejercitamos con un rol.
const roleResult = (method, path, role) => {
  let err;
  handlersOf(method, path)[0]({ user: { role } }, res, (e) => { err = e; });
  return err;
};

describe('sessions.routes', () => {
  it('authenticate va global, antes de las rutas, sin requireRole global', () => {
    const guards = router.stack.filter((layer) => !layer.route).map((layer) => layer.handle);
    expect(guards).toEqual([authenticate]);
    expect(router.stack[0].route).toBeUndefined();
    expect(router.stack[1].route).toBeDefined();
  });

  it.each([['post', '/'], ['patch', '/:id'], ['post', '/:id/sets']])(
    '%s %s exige student',
    (method, path) => {
      expect(roleResult(method, path, 'trainer')).toMatchObject({ statusCode: 403 });
      expect(roleResult(method, path, 'student')).toBeUndefined();
    }
  );

  it('PATCH /:id/comment exige trainer', () => {
    expect(roleResult('patch', '/:id/comment', 'student')).toMatchObject({ statusCode: 403 });
    expect(roleResult('patch', '/:id/comment', 'trainer')).toBeUndefined();
  });

  it('PATCH /:id/comment valida el body en el middleware', () => {
    const handlers = handlersOf('patch', '/:id/comment');
    expect(handlers).toHaveLength(4);
    let err;
    handlers[2]({ body: { trainer_comment: 5 } }, {}, (e) => { err = e; });
    expect(err).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });

  it('expone POST /, PATCH /:id, POST /:id/sets y PATCH /:id/comment', () => {
    expect(routeOf('post', '/')).toBeDefined();
    expect(routeOf('patch', '/:id')).toBeDefined();
    expect(routeOf('post', '/:id/sets')).toBeDefined();
    expect(routeOf('patch', '/:id/comment')).toBeDefined();
  });

  it('POST /:id/sets valida el envelope en el middleware, antes del controller', () => {
    const handlers = routeOf('post', '/:id/sets').route.stack.map((l) => l.handle);
    expect(handlers).toHaveLength(4);
    const req = { body: { sets: [] }, params: {} };
    let err;
    handlers[2](req, {}, (e) => { err = e; });
    expect(err).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    const ok = { body: { sets: [{ id: 'x' }], extra: 1 } };
    err = undefined;
    handlers[2](ok, {}, (e) => { err = e; });
    expect(err).toBeUndefined();
    expect(ok.body).toEqual({ sets: [{ id: 'x' }] });
  });
});
