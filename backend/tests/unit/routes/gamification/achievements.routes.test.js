import { describe, it, expect } from '@jest/globals';
import router from '../../../../src/routes/gamification/achievements.routes.js';
import { authenticate } from '../../../../src/shared/middlewares/auth.middleware.js';

const handlers = router.stack.find((l) => l.route?.path === '/' && l.route.methods.get).route.stack.map((l) => l.handle);
const res = { status: () => res, json: () => res };
const roleResult = (role) => {
  let err;
  handlers[1]({ user: { role } }, res, (e) => { err = e; });
  return err;
};

describe('GET /achievements', () => {
  it('exige authenticate y rol trainer o student', () => {
    expect(handlers[0]).toBe(authenticate);
    expect(roleResult('admin')).toMatchObject({ statusCode: 403 });
    expect(roleResult('trainer')).toBeUndefined();
    expect(roleResult('student')).toBeUndefined();
  });
});
