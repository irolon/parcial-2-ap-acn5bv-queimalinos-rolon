import { describe, it, expect } from '@jest/globals';
import { validateChangePassword } from '../../../../src/validations/auth/password.validation.js';

const VALID = { current_password: 'Vieja1234', new_password: 'Nueva1234', refresh_token: 'rt' };

/** Detalles del VALIDATION_ERROR que tira el body dado. */
function detailsOf(body) {
  try {
    validateChangePassword(body);
  } catch (err) {
    expect(err).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    return err.details;
  }
  throw new Error('No tiró VALIDATION_ERROR');
}

describe('validateChangePassword', () => {
  it('válido sin push_token → objeto sin esa clave', () => {
    expect(validateChangePassword(VALID)).toEqual(VALID);
  });

  it('con push_token lo devuelve', () => {
    expect(validateChangePassword({ ...VALID, push_token: 'fcm:abc' }).push_token).toBe('fcm:abc');
  });

  it.each([
    ['vacía', ''],
    ['no string', 123],
    ['ausente', undefined],
  ])('current_password %s → detalle en current_password', (_caso, current_password) => {
    expect(detailsOf({ ...VALID, current_password })).toEqual([
      { field: 'current_password', message: 'La contraseña actual es requerida' },
    ]);
  });

  it('new_password corta → detalle en new_password (no en password)', () => {
    const details = detailsOf({ ...VALID, new_password: 'corta' });
    expect(details).toHaveLength(1);
    expect(details[0].field).toBe('new_password');
    expect(details[0].message).toMatch(/8 caracteres/);
  });

  it('new_password sin mayúscula ni número → los dos mensajes en new_password', () => {
    const details = detailsOf({ ...VALID, new_password: 'sinreglas' });
    expect(details.map((d) => d.field)).toEqual(['new_password', 'new_password']);
    expect(details[0].message).toMatch(/mayúscula/);
    expect(details[1].message).toMatch(/número/);
  });

  it('sin refresh_token → detalle en refresh_token', () => {
    expect(detailsOf({ ...VALID, refresh_token: undefined })).toEqual([
      { field: 'refresh_token', message: 'refresh_token es requerido' },
    ]);
  });

  it('push_token de 4097 caracteres → detalle en push_token', () => {
    const details = detailsOf({ ...VALID, push_token: 'a'.repeat(4097) });
    expect(details.map((d) => d.field)).toEqual(['push_token']);
  });
});
