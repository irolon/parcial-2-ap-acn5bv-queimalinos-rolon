import {
  validateListQuery,
  validateStudentIdParam,
  validateUpdateStudent,
} from '../../../../src/validations/students/students.validation.js';

const UUID = '3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c';

describe('students.validation — validateListQuery', () => {
  it('sin active trae solo los activos', () => {
    expect(validateListQuery({}).active).toBe(true);
  });
  it('active=false pide los dados de baja', () => {
    expect(validateListQuery({ active: 'false' }).active).toBe(false);
  });
});

describe('students.validation — validateStudentIdParam', () => {
  it('acepta un UUID y lo pasa a minúsculas', () => {
    expect(validateStudentIdParam({ id: UUID.toUpperCase() })).toEqual({ id: UUID });
  });
  it('rechaza lo que no es UUID', () => {
    expect(() => validateStudentIdParam({ id: 'abc' })).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400 })
    );
  });
});

describe('students.validation — validateUpdateStudent', () => {
  const invalid = (body) =>
    expect(() => validateUpdateStudent(body)).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR' })
    );

  it('acepta todos los campos editables y recorta textos', () => {
    expect(
      validateUpdateStudent({
        name: '  Ana Pérez ',
        goal: 'strength',
        level: 'beginner',
        active: false,
        birth_date: '1995-04-30',
        gym_equipment: [' barbell ', 'cable'],
        injuries: ' rodilla derecha ',
      })
    ).toEqual({
      name: 'Ana Pérez',
      goal: 'strength',
      level: 'beginner',
      active: false,
      birth_date: '1995-04-30',
      gym_equipment: ['barbell', 'cable'],
      injuries: 'rodilla derecha',
    });
  });

  it('acepta null para borrar birth_date, gym_equipment e injuries', () => {
    expect(validateUpdateStudent({ birth_date: null, gym_equipment: null, injuries: null })).toEqual(
      { birth_date: null, gym_equipment: null, injuries: null }
    );
  });

  it('rechaza el body vacío', () => invalid({}));
  it('rechaza un body con solo campos no editables', () => invalid({ email: 'x@y.com', trainer_id: UUID }));
  it('rechaza name de 1 caracter', () => invalid({ name: 'A' }));
  it('rechaza goal fuera del enum', () => invalid({ goal: 'cardio' }));
  it('rechaza level fuera del enum', () => invalid({ level: 'pro' }));
  it('rechaza active que no es booleano', () => invalid({ active: 'false' }));
  it('rechaza birth_date futura', () => invalid({ birth_date: '2999-01-01' }));
  it('rechaza birth_date inexistente', () => invalid({ birth_date: '2026-02-30' }));
  it('rechaza birth_date con otro formato', () => invalid({ birth_date: '30/04/1995' }));
  it('rechaza gym_equipment que no es lista', () => invalid({ gym_equipment: 'barbell' }));
  it('rechaza gym_equipment con un elemento vacío', () => invalid({ gym_equipment: ['  '] }));
  it('rechaza gym_equipment con más de 30 elementos', () =>
    invalid({ gym_equipment: Array.from({ length: 31 }, (_, i) => `e${i}`) }));
  it('rechaza injuries de más de 1000 caracteres', () => invalid({ injuries: 'x'.repeat(1001) }));
});

describe('students.validation — validateUpdateStudent · phone (GX2)', () => {
  const phoneError = (phone) => {
    try {
      validateUpdateStudent({ phone });
    } catch (err) {
      return err.details.find((d) => d.field === 'phone')?.message;
    }
    return undefined;
  };
  const MSG = 'phone debe tener entre 6 y 30 caracteres con al menos 6 dígitos: números, espacios y + - ( )';

  it('acepta el formato y lo recorta', () => {
    expect(validateUpdateStudent({ phone: ' +54 9 11 2233-4455 ' })).toEqual({ phone: '+54 9 11 2233-4455' });
  });
  it('vacío o solo espacios → null', () => {
    expect(validateUpdateStudent({ phone: '' })).toEqual({ phone: null });
    expect(validateUpdateStudent({ phone: '  ' })).toEqual({ phone: null });
  });
  it('null → null (borrar)', () => {
    expect(validateUpdateStudent({ phone: null })).toEqual({ phone: null });
  });
  it('rechaza 5 caracteres', () => expect(phoneError('12345')).toBe(MSG));
  it('rechaza símbolos sin dígitos o con menos de 6 ("------", "(12) 3-4-5")', () => {
    expect(phoneError('------')).toBe(MSG);
    expect(phoneError('(12) 3-4-5')).toBe(MSG);
  });
  it('acepta 6 dígitos con separadores', () => {
    expect(validateUpdateStudent({ phone: '12-34-56' })).toEqual({ phone: '12-34-56' });
  });
  it('rechaza letras', () => expect(phoneError('abc123456')).toBe(MSG));
  it('rechaza 31 caracteres', () => expect(phoneError('1'.repeat(31))).toBe(MSG));
  it('rechaza un número (no string)', () => expect(phoneError(1122334455)).toBe(MSG));
  it('el mensaje de "al menos un campo" nombra phone', () => {
    try {
      validateUpdateStudent({});
    } catch (err) {
      expect(err.details[0].message).toContain('phone');
    }
    expect.assertions(1);
  });
});
