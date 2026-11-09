import { describe, it, expect } from '@jest/globals';
import studentsRouter from '../../../../src/routes/students/students.routes.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';
import * as studentsController from '../../../../src/controllers/students/students.controller.js';
import * as exportController from '../../../../src/controllers/export/export.controller.js';
import * as avatarController from '../../../../src/controllers/students/avatar.controller.js';
import { parseImageUpload } from '../../../../src/shared/middlewares/upload.middleware.js';

const getRoutes = () =>
  studentsRouter.stack.filter((l) => l.route?.methods.get).map((l) => l.route);
const res = { status: () => res, json: () => res };

describe('students.routes — GET /students/overview', () => {
  const route = getRoutes().find((r) => r.path === '/overview');

  it('existe y va antes de /:id (si no, "overview" se tomaría como un id)', () => {
    const paths = getRoutes().map((r) => r.path);
    expect(paths.indexOf('/overview')).toBeGreaterThanOrEqual(0);
    expect(paths.indexOf('/overview')).toBeLessThan(paths.indexOf('/:id'));
  });

  it('exige authenticate, solo trainer y termina en su controller', () => {
    const [auth, role, handler] = route.stack.map((l) => l.handle);
    expect(auth).toBe(authenticate);
    let err;
    role({ user: { role: 'student' } }, res, (e) => {
      err = e;
    });
    expect(err).toMatchObject({ statusCode: 403 });
    err = 'sin llamar';
    role({ user: { role: 'trainer' } }, res, (e) => {
      err = e;
    });
    expect(err).toBeUndefined();
    expect(handler).toBe(studentsController.overview);
  });
});

describe('students.routes — GET /students/:id/attendance', () => {
  it('trainer o student, valida el id y el mes, y termina en su controller', () => {
    const route = getRoutes().find((r) => r.path === '/:id/attendance');
    const handlers = route.stack.map((l) => l.handle);
    expect(handlers[0]).toBe(authenticate);
    expect(handlers).toHaveLength(5);
    expect(handlers[4]).toBe(studentsController.attendance);
  });
});

describe('students.routes — POST /students/:id/password-reset (GX1)', () => {
  it('limitador primero, authenticate, solo trainer, valida el id y termina en su controller', () => {
    const route = studentsRouter.stack.find(
      (l) => l.route?.path === '/:id/password-reset' && l.route.methods.post
    ).route;
    const [limiter, auth, role, params, handler] = route.stack.map((l) => l.handle);
    expect(limiter.rateLimit).toBe('passwordReset');
    expect(auth).toBe(authenticate);
    let err;
    role({ user: { role: 'student' } }, res, (e) => {
      err = e;
    });
    expect(err).toMatchObject({ statusCode: 403 });
    expect(params.validates).toBe('params');
    expect(handler).toBe(studentsController.resetPassword);
  });
});

describe('students.routes — exportación CSV (GX1)', () => {
  const handlersOf = (path) => getRoutes().find((r) => r.path === path).stack;

  it('GET /export va antes de /:id (si no, "export" se tomaría como un id)', () => {
    const paths = getRoutes().map((r) => r.path);
    expect(paths.indexOf('/export')).toBeGreaterThanOrEqual(0);
    expect(paths.indexOf('/export')).toBeLessThan(paths.indexOf('/:id'));
  });

  it('GET /export: limitador primero, authenticate, solo trainer y su controller', () => {
    const [limiter, auth, role, handler] = handlersOf('/export').map((l) => l.handle);
    expect(limiter.rateLimit).toBe('export');
    expect(auth).toBe(authenticate);
    let err;
    role({ user: { role: 'student' } }, res, (e) => {
      err = e;
    });
    expect(err).toMatchObject({ statusCode: 403 });
    expect(handler).toBe(exportController.exportTrainer);
  });

  it('GET /:id/export: limitador primero, trainer o student, valida el id y su controller', () => {
    const [limiter, auth, role, params, handler] = handlersOf('/:id/export').map((l) => l.handle);
    expect(limiter.rateLimit).toBe('export');
    expect(auth).toBe(authenticate);
    let err = 'sin llamar';
    role({ user: { role: 'student' } }, res, (e) => {
      err = e;
    });
    expect(err).toBeUndefined();
    expect(params.validates).toBe('params');
    expect(handler).toBe(exportController.exportStudent);
  });
});

describe('students.routes — PATCH /students/:id (GX2)', () => {
  it('deja pasar trainer y student en el requireRole, valida id y body, y termina en update', () => {
    const route = studentsRouter.stack.find((l) => l.route?.path === '/:id' && l.route.methods.patch).route;
    const [auth, role, params, body, handler] = route.stack.map((l) => l.handle);
    expect(auth).toBe(authenticate);
    for (const r of ['trainer', 'student']) {
      let err = 'sin llamar';
      role({ user: { role: r } }, res, (e) => {
        err = e;
      });
      expect(err).toBeUndefined();
    }
    expect(params.validates).toBe('params');
    expect(body.validates).not.toBe('params');
    expect(handler).toBe(studentsController.update);
  });
});

describe('students.routes — PUT y DELETE /students/:id/avatar (GX2)', () => {
  const chainOf = (method) =>
    studentsRouter.stack.find((l) => l.route?.path === '/:id/avatar' && l.route.methods[method]).route.stack.map((l) => l.handle);
  const roleRejects = (role, r) => {
    let err = 'sin llamar';
    role({ user: { role: r } }, res, (e) => {
      err = e;
    });
    return err;
  };

  it('PUT: authenticate, solo student, valida el id, después parsea el multipart y termina en setAvatar', () => {
    const [auth, role, params, upload, handler] = chainOf('put');
    expect(auth).toBe(authenticate);
    expect(roleRejects(role, 'trainer')).toMatchObject({ statusCode: 403 });
    expect(roleRejects(role, 'student')).toBeUndefined();
    expect(params.validates).toBe('params');
    expect(upload).toBe(parseImageUpload);
    expect(handler).toBe(avatarController.setAvatar);
  });

  it('DELETE: authenticate, solo student, valida el id y termina en removeAvatar', () => {
    const [auth, role, params, handler] = chainOf('delete');
    expect(auth).toBe(authenticate);
    expect(roleRejects(role, 'trainer')).toMatchObject({ statusCode: 403 });
    expect(params.validates).toBe('params');
    expect(handler).toBe(avatarController.removeAvatar);
  });

  it('van antes de los router.use("/:id…") de las subrutas', () => {
    const idx = studentsRouter.stack.findIndex((l) => l.route?.path === '/:id/avatar');
    const firstUse = studentsRouter.stack.findIndex((l) => !l.route);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(firstUse);
  });
});
