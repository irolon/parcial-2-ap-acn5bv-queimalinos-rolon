import { describe, it, expect } from '@jest/globals';
import { limitBodyFieldsForRole } from '../../../../src/shared/middlewares/body-fields.middleware.js';

const MESSAGE = 'Solo podés cambiar tu nombre, teléfono y foto';
const guard = limitBodyFieldsForRole('student', ['name', 'phone'], MESSAGE);

/** Corre el middleware y devuelve lo que le pasó a next (undefined = siguió). */
function run(user, body) {
  let result = 'sin llamar';
  guard({ user, body }, {}, (err) => {
    result = err;
  });
  return result;
}

describe('limitBodyFieldsForRole', () => {
  const student = { id: 's1', role: 'student' };

  it('el rol limitado con solo campos permitidos sigue', () => {
    expect(run(student, { name: 'Ana', phone: '1122334455' })).toBeUndefined();
    expect(run(student, { phone: null })).toBeUndefined();
  });

  it('el rol limitado con cualquier otro campo, aunque el validador lo ignore → 403 con el mensaje', () => {
    for (const body of [{ goal: 'strength' }, { name: 'Ana', email: 'x@mail.com' }, { avatar_url: 'students/otro/a.jpg' }]) {
      expect(run(student, body)).toMatchObject({ statusCode: 403, code: 'FORBIDDEN', message: MESSAGE });
    }
  });

  it('los otros roles pasan con cualquier campo', () => {
    expect(run({ id: 't1', role: 'trainer' }, { goal: 'strength', active: false })).toBeUndefined();
  });

  it('sin body sigue (el validador responde el 400)', () => {
    expect(run(student, undefined)).toBeUndefined();
  });
});
