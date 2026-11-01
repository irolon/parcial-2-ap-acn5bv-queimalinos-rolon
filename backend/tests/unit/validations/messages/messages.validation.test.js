import {
  validateStudentIdParam,
  validateHistoryQuery,
  validateSendBody,
  validateBroadcast,
} from '../../../../src/validations/messages/messages.validation.js';

const UUID = '3F2504E0-4F89-41D3-9A0C-0305E82C3301';
const UUID2 = '3f2504e0-4f89-41d3-9a0c-0305e82c3302';
const is400 = expect.objectContaining({ statusCode: 400, code: 'VALIDATION_ERROR' });
const ids = (n) =>
  Array.from({ length: n }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);

describe('validateStudentIdParam', () => {
  it('acepta uuid y lo baja a minúsculas', () => {
    expect(validateStudentIdParam({ studentId: UUID })).toEqual({ studentId: UUID.toLowerCase() });
  });
  it('rechaza un id inválido', () => {
    expect(() => validateStudentIdParam({ studentId: 'x' })).toThrow(is400);
    expect(() => validateStudentIdParam({})).toThrow(is400);
  });
});

describe('validateHistoryQuery', () => {
  it('aplica defaults', () => {
    expect(validateHistoryQuery({})).toEqual({ before: null, limit: 50 });
  });
  it('parsea valores válidos', () => {
    expect(validateHistoryQuery({ before: '2026-10-31T10:00:00Z', limit: '100' })).toEqual({
      before: '2026-10-31T10:00:00Z', limit: 100,
    });
    expect(validateHistoryQuery({ limit: '1' }).limit).toBe(1);
  });
  it.each([
    [{ limit: '0' }], [{ limit: '101' }], [{ limit: '1.5' }], [{ limit: 'abc' }], [{ limit: '-3' }],
    [{ before: '2026-10-31' }], [{ before: 'ayer' }], [{ before: '2026-10-31T10:00:00' }],
  ])('rechaza %j', (query) => {
    expect(() => validateHistoryQuery(query)).toThrow(is400);
  });
});

describe('validateSendBody', () => {
  it('recorta el texto', () => {
    expect(validateSendBody({ body: '  hola  ' })).toEqual({ body: 'hola' });
  });
  it('vacío, en blanco o ausente da null (puede ir solo la foto)', () => {
    expect(validateSendBody({ body: '   ' })).toEqual({ body: null });
    expect(validateSendBody({ body: '' })).toEqual({ body: null });
    expect(validateSendBody({})).toEqual({ body: null });
    expect(validateSendBody(undefined)).toEqual({ body: null });
  });
  it('acepta exactamente 2000 y rechaza 2001', () => {
    expect(validateSendBody({ body: 'a'.repeat(2000) }).body).toHaveLength(2000);
    expect(() => validateSendBody({ body: 'a'.repeat(2001) })).toThrow(is400);
  });
  it('cuenta caracteres reales, no unidades UTF-16', () => {
    expect(validateSendBody({ body: '\u{1F4AA}'.repeat(2000) }).body).not.toBeNull();
  });
  it('rechaza un body que no es texto', () => {
    expect(() => validateSendBody({ body: 5 })).toThrow(is400);
  });
});

describe('validateBroadcast', () => {
  it('devuelve ids en minúsculas y el texto recortado', () => {
    expect(validateBroadcast({ student_ids: [UUID, UUID2], body: ' hola ' })).toEqual({
      studentIds: [UUID.toLowerCase(), UUID2], body: 'hola',
    });
  });
  it('rechaza ids repetidos (aunque difieran en mayúsculas)', () => {
    expect(() => validateBroadcast({ student_ids: [UUID, UUID.toLowerCase()], body: 'x' })).toThrow(is400);
  });
  it('rechaza lista vacía, de 201 ids, no array y ids no uuid', () => {
    expect(validateBroadcast({ student_ids: ids(200), body: 'x' }).studentIds).toHaveLength(200);
    expect(() => validateBroadcast({ student_ids: [], body: 'x' })).toThrow(is400);
    expect(() => validateBroadcast({ student_ids: ids(201), body: 'x' })).toThrow(is400);
    expect(() => validateBroadcast({ student_ids: UUID, body: 'x' })).toThrow(is400);
    expect(() => validateBroadcast({ student_ids: ['x'], body: 'x' })).toThrow(is400);
    expect(() => validateBroadcast({ body: 'x' })).toThrow(is400);
  });
  it('el body es obligatorio y de hasta 2000', () => {
    expect(() => validateBroadcast({ student_ids: [UUID] })).toThrow(is400);
    expect(() => validateBroadcast({ student_ids: [UUID], body: '   ' })).toThrow(is400);
    expect(() => validateBroadcast({ student_ids: [UUID], body: 'a'.repeat(2001) })).toThrow(is400);
    expect(validateBroadcast({ student_ids: [UUID], body: 'a'.repeat(2000) }).body).toHaveLength(2000);
  });
  it('junta los errores de ambos campos', () => {
    expect.assertions(1);
    try {
      validateBroadcast({ student_ids: [], body: '' });
    } catch (e) {
      expect(e.details.map((d) => d.field)).toEqual(['student_ids', 'body']);
    }
  });
});
