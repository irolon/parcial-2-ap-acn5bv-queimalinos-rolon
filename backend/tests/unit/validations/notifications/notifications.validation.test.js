import { describe, it, expect } from '@jest/globals';
import {
  validateNotificationIdParam,
  validateListQuery,
  validateRegisterToken,
  validateTokenParam,
  validatePreferences,
} from '../../../../src/validations/notifications/notifications.validation.js';

const UUID = '3F2504E0-4F89-41D3-9A0C-0305E82C3301';

describe('validateNotificationIdParam', () => {
  it('acepta uuid y lo baja a minúsculas', () => {
    expect(validateNotificationIdParam({ id: UUID })).toEqual({ id: UUID.toLowerCase() });
  });
  it('rechaza un id inválido', () => {
    expect(() => validateNotificationIdParam({ id: 'x' })).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('validateListQuery', () => {
  it('aplica defaults', () => {
    expect(validateListQuery({})).toEqual({ unread_only: false, limit: 20 });
  });
  it('parsea valores válidos', () => {
    expect(validateListQuery({ unread_only: 'true', limit: '100', before: '2026-10-30T10:00:00Z' })).toEqual({
      unread_only: true, limit: 100, before: '2026-10-30T10:00:00Z',
    });
  });
  it.each([
    [{ unread_only: 'yes' }], [{ limit: '0' }], [{ limit: '101' }], [{ limit: '1.5' }],
    [{ limit: 'abc' }], [{ before: '2026-10-30' }], [{ before: 'ayer' }],
  ])('rechaza %j', (query) => {
    expect(() => validateListQuery(query)).toThrow(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
  });
});

describe('validateRegisterToken', () => {
  it('acepta token y plataforma válidos', () => {
    expect(validateRegisterToken({ token: 'abc', platform: 'web', extra: 1 })).toEqual({ token: 'abc', platform: 'web' });
  });
  it.each([
    [{ platform: 'web' }], [{ token: '', platform: 'web' }], [{ token: 'x'.repeat(4097), platform: 'web' }],
    [{ token: 'abc', platform: 'ios' }], [{ token: 5, platform: 'android' }],
  ])('rechaza %j', (body) => {
    expect(() => validateRegisterToken(body)).toThrow(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
  });
  it('acepta token de 4096 caracteres', () => {
    expect(validateRegisterToken({ token: 'x'.repeat(4096), platform: 'android' }).platform).toBe('android');
  });
});

describe('validateTokenParam', () => {
  it('acepta un token de 1 a 4096 caracteres', () => {
    expect(validateTokenParam({ token: 'abc' })).toEqual({ token: 'abc' });
    expect(validateTokenParam({ token: 'x'.repeat(4096) }).token).toHaveLength(4096);
  });
  it.each([[{}], [{ token: '' }], [{ token: 'x'.repeat(4097) }], [{ token: 5 }]])('rechaza %j', (params) => {
    expect(() => validateTokenParam(params)).toThrow(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
  });
});

const PREFS = { message: true, comment: false, appointment: true, pr: true, achievement: true };
const fieldsOf = (body) => {
  try {
    validatePreferences(body);
  } catch (err) {
    return err.details.map((d) => d.field);
  }
  return [];
};

describe('validatePreferences', () => {
  it('acepta los cinco booleanos y devuelve solo esos', () => {
    expect(validatePreferences({ ...PREFS, student_id: 'otro', extra: 1 })).toEqual(PREFS);
  });
  it('falta uno → detalle en ese campo', () => {
    const { pr: _pr, ...rest } = PREFS;
    expect(fieldsOf(rest)).toEqual(['pr']);
  });
  it('un string "false" no es booleano', () => {
    expect(fieldsOf({ ...PREFS, message: 'false' })).toEqual(['message']);
    expect(() => validatePreferences({ ...PREFS, message: 'false' }))
      .toThrow(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
  });
  it.each([[{}], [null], [undefined]])('%j → los cinco detalles', (body) => {
    expect(fieldsOf(body)).toEqual(['message', 'comment', 'appointment', 'pr', 'achievement']);
  });
});
