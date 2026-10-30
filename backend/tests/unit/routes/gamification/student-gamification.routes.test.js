import { describe, it, expect } from '@jest/globals';
import studentRouter from '../../../../src/routes/gamification/student-gamification.routes.js';
import studentsRouter from '../../../../src/routes/students/students.routes.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';

const handlersOf = (router, path) =>
  router.stack.find((l) => l.route?.path === path && l.route.methods.get).route.stack.map((l) => l.handle);
const res = { status: () => res, json: () => res };
const roleResult = (router, path, role) => {
  let err;
  handlersOf(router, path)[1]({ user: { role } }, res, (e) => { err = e; });
  return err;
};

describe.each([
  ['GET /students/:id/achievements', studentRouter, '/achievements'],
  ['GET /students/:id/streak', studentRouter, '/streak'],
])('%s', (_name, router, path) => {
  it('exige authenticate y rol trainer o student', () => {
    expect(handlersOf(router, path)[0]).toBe(authenticate);
    expect(roleResult(router, path, 'admin')).toMatchObject({ statusCode: 403 });
    expect(roleResult(router, path, 'trainer')).toBeUndefined();
    expect(roleResult(router, path, 'student')).toBeUndefined();
  });
});

describe('montaje', () => {
  it('students.routes monta las rutas de gamificación bajo /:id', () => {
    expect(studentsRouter.stack.some((l) => l.handle === studentRouter)).toBe(true);
  });

  it('las rutas con :id validan el id antes del controller', () => {
    const handlers = handlersOf(studentRouter, '/streak');
    expect(handlers).toHaveLength(4);
    let err;
    handlers[2]({ params: { id: 'x' } }, {}, (e) => { err = e; });
    expect(err).toMatchObject({ statusCode: 400 });
  });
});
