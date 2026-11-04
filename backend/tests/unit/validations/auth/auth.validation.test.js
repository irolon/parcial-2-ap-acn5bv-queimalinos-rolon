import { describe, it, expect } from '@jest/globals';
import { validateLogout } from '../../../../src/validations/auth/auth.validation.js';

const bad400 = expect.objectContaining({ statusCode: 400 });

describe('validateLogout', () => {
  it('sin push_token devuelve solo el refresh_token (como antes)', () => {
    expect(validateLogout({ refresh_token: ' rt ' })).toEqual({ refresh_token: 'rt' });
  });

  it('acepta push_token y lo devuelve sin tocar', () => {
    expect(validateLogout({ refresh_token: 'rt', push_token: 'fcm:abc' })).toEqual({
      refresh_token: 'rt',
      push_token: 'fcm:abc',
    });
  });

  it('acepta push_token de 4096 caracteres', () => {
    const push_token = 'a'.repeat(4096);
    expect(validateLogout({ refresh_token: 'rt', push_token }).push_token).toBe(push_token);
  });

  it('sigue exigiendo refresh_token', () => {
    expect(() => validateLogout({ push_token: 'fcm' })).toThrow(bad400);
  });

  it.each([
    ['vacío', ''],
    ['más de 4096 caracteres', 'a'.repeat(4097)],
    ['número', 123],
    ['null', null],
    ['objeto', { token: 'x' }],
  ])('rechaza push_token %s con 400 en el campo push_token', (_, push_token) => {
    expect(() => validateLogout({ refresh_token: 'rt', push_token })).toThrow(bad400);
    try {
      validateLogout({ refresh_token: 'rt', push_token });
    } catch (err) {
      expect(err.details).toEqual([expect.objectContaining({ field: 'push_token' })]);
    }
  });
});
