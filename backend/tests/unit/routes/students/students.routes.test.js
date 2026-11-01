import { describe, it, expect } from '@jest/globals';
import studentsRouter from '../../../../src/routes/students/students.routes.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';
import * as studentsController from '../../../../src/controllers/students/students.controller.js';

const getRoutes = () => studentsRouter.stack.filter((l) => l.route?.methods.get).map((l) => l.route);
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
    role({ user: { role: 'student' } }, res, (e) => { err = e; });
    expect(err).toMatchObject({ statusCode: 403 });
    err = 'sin llamar';
    role({ user: { role: 'trainer' } }, res, (e) => { err = e; });
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
