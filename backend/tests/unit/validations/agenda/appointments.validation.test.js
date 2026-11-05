import {
  validateStudentRequest,
  validateTrainerCreate,
  validateStatusPatch,
  validateIdParam,
} from '../../../../src/validations/agenda/appointments.validation.js';

const UUID = '3F2504E0-4F89-41D3-9A0C-0305E82C3301';
const WHEN = '2026-11-06T18:00:00-03:00';
const fieldsOf = (fn) => {
  try {
    fn();
  } catch (e) {
    expect(e).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    return e.details.map((d) => d.field);
  }
  throw new Error('no tiró');
};

describe('validateStudentRequest', () => {
  it('normaliza scheduled_at a ISO UTC y notes a null si falta', () => {
    expect(validateStudentRequest({ scheduled_at: WHEN })).toEqual({
      scheduled_at: '2026-11-06T21:00:00.000Z',
      notes: null,
    });
  });

  it('recorta la nota y trata la vacía como null', () => {
    expect(validateStudentRequest({ scheduled_at: WHEN, notes: '  traigo banda  ' }).notes).toBe('traigo banda');
    expect(validateStudentRequest({ scheduled_at: WHEN, notes: '   ' }).notes).toBeNull();
    expect(validateStudentRequest({ scheduled_at: WHEN, notes: null }).notes).toBeNull();
  });

  it('la nota admite 500 caracteres y no 501', () => {
    expect(validateStudentRequest({ scheduled_at: WHEN, notes: 'a'.repeat(500) }).notes).toHaveLength(500);
    expect(fieldsOf(() => validateStudentRequest({ scheduled_at: WHEN, notes: 'a'.repeat(501) }))).toEqual(['notes']);
    expect(fieldsOf(() => validateStudentRequest({ scheduled_at: WHEN, notes: 5 }))).toEqual(['notes']);
  });

  it('exige scheduled_at ISO con zona', () => {
    expect(fieldsOf(() => validateStudentRequest({}))).toEqual(['scheduled_at']);
    expect(fieldsOf(() => validateStudentRequest(undefined))).toEqual(['scheduled_at']);
    expect(fieldsOf(() => validateStudentRequest({ scheduled_at: '2026-11-06T18:00:00' }))).toEqual(['scheduled_at']);
    expect(fieldsOf(() => validateStudentRequest({ scheduled_at: '2026-02-30T18:00:00Z' }))).toEqual(['scheduled_at']);
  });
});

describe('validateTrainerCreate', () => {
  it('acepta student_id uuid (en minúsculas) y scheduled_at', () => {
    expect(validateTrainerCreate({ student_id: UUID, scheduled_at: WHEN, notes: 'x' })).toEqual({
      student_id: UUID.toLowerCase(),
      scheduled_at: '2026-11-06T21:00:00.000Z',
      notes: 'x',
    });
  });

  it('acumula student_id y scheduled_at inválidos', () => {
    expect(fieldsOf(() => validateTrainerCreate({ student_id: 'x' }))).toEqual(['scheduled_at', 'student_id']);
    expect(fieldsOf(() => validateTrainerCreate(undefined))).toEqual(['scheduled_at', 'student_id']);
  });
});

describe('validateStatusPatch', () => {
  it.each(['confirmed', 'cancelled'])('acepta %s', (status) => {
    expect(validateStatusPatch({ status })).toEqual({ status });
  });

  it.each(['pending', 'otro', undefined, 1])('rechaza %p', (status) => {
    expect(fieldsOf(() => validateStatusPatch({ status }))).toEqual(['status']);
  });
});

describe('validateIdParam', () => {
  it('acepta uuid y lo baja a minúsculas', () => {
    expect(validateIdParam({ id: UUID })).toEqual({ id: UUID.toLowerCase() });
  });
  it('rechaza un id inválido', () => {
    expect(fieldsOf(() => validateIdParam({ id: 'x' }))).toEqual(['id']);
  });
});
