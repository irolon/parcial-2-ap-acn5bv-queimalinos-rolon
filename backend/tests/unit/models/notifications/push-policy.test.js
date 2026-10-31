import { shouldPush } from '../../../../src/models/notifications/push-policy.js';

describe('shouldPush', () => {
  it.each([
    ['inactivity', 'trainer', undefined, true],
    ['inactivity', 'student', undefined, false],
    ['routine_modified', 'trainer', undefined, true],
    ['routine_modified', 'student', undefined, false],
    ['pr', 'student', undefined, true],
    ['pr', 'trainer', undefined, false],
    ['achievement', 'student', undefined, true],
    ['achievement', 'student', { fromJob: true }, false],
    ['achievement', 'trainer', undefined, false],
    ['achievement', 'trainer', { fromJob: true }, false],
    ['comment', 'student', undefined, true],
    ['comment', 'trainer', undefined, false],
    ['appointment', 'student', undefined, false],
    ['desconocido', 'trainer', undefined, false],
  ])('%s para %s %j → %s', (type, role, opts, expected) => {
    expect(shouldPush(type, role, opts)).toBe(expected);
  });
});
