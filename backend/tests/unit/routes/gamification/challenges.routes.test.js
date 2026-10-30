import { describe, it, expect } from '@jest/globals';
import router from '../../../../src/routes/gamification/challenges.routes.js';
import studentRouter from '../../../../src/routes/gamification/student-gamification.routes.js';
import { createApp } from '../../../../src/app.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';

const handlersOf = (r, path, method) =>
  r.stack.find((l) => l.route?.path === path && l.route.methods[method]).route.stack.map((l) => l.handle);
const res = { status: () => res, json: () => res };
const roleResult = (r, path, method, role) => {
  let err;
  handlersOf(r, path, method)[1]({ user: { role } }, res, (e) => {
    err = e;
  });
  return err;
};

describe.each([
  ['POST /challenges', router, '/', 'post'],
  ['PATCH /challenges/:id', router, '/:id', 'patch'],
  ['DELETE /challenges/:id', router, '/:id', 'delete'],
  ['POST /challenges/:id/assignments', router, '/:id/assignments', 'post'],
])('%s (solo trainer)', (_n, r, path, method) => {
  it('exige authenticate y rol trainer', () => {
    expect(handlersOf(r, path, method)[0]).toBe(authenticate);
    expect(roleResult(r, path, method, 'student')).toMatchObject({ statusCode: 403 });
    expect(roleResult(r, path, method, 'trainer')).toBeUndefined();
  });
});

describe.each([
  ['GET /challenges', router, '/', 'get'],
  ['GET /students/:id/challenges', studentRouter, '/challenges', 'get'],
  ['POST /students/:id/challenges', studentRouter, '/challenges', 'post'],
])('%s (trainer o student)', (_n, r, path, method) => {
  it('exige authenticate y rol trainer o student', () => {
    expect(handlersOf(r, path, method)[0]).toBe(authenticate);
    expect(roleResult(r, path, method, 'admin')).toMatchObject({ statusCode: 403 });
    expect(roleResult(r, path, method, 'student')).toBeUndefined();
  });
});

it('createApp monta /api/challenges', () => {
  const app = createApp();
  const stack = app._router?.stack ?? app.router.stack;
  expect(stack.some((l) => l.handle === router)).toBe(true);
});
