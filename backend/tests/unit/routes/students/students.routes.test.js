import { describe, it, expect } from '@jest/globals';
import studentsRouter from '../../../../src/routes/students/students.routes.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';
import * as studentsController from '../../../../src/controllers/students/students.controller.js';
import * as exportController from '../../../../src/controllers/export/export.controller.js';

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
