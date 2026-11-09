import { describe, expect, it } from 'vitest';
import { PASSWORD_RULES, checkPasswordRules, validatePasswordChange } from '@/utils/account/passwordRules';

const RULES_MESSAGE = 'Tiene que tener 8 caracteres o más, una mayúscula y un número';
const okValues = { current_password: 'Viej4clave', new_password: 'Nuev4clave', repeat: 'Nuev4clave' };

describe('checkPasswordRules', () => {
  it('lista las tres reglas con sus textos', () => {
    expect(PASSWORD_RULES.map((r) => r.label)).toEqual(['8 caracteres o más', 'Una mayúscula', 'Un número']);
  });

  it('vacía no cumple ninguna', () => {
    expect(checkPasswordRules('').map((r) => r.ok)).toEqual([false, false, false]);
  });

  it('marca cada regla por separado', () => {
    expect(checkPasswordRules('abcdefgh').map((r) => r.ok)).toEqual([true, false, false]);
    expect(checkPasswordRules('Ab1').map((r) => r.ok)).toEqual([false, true, true]);
    expect(checkPasswordRules('Abcdefg1')).toEqual([
      { id: 'length', label: '8 caracteres o más', ok: true },
      { id: 'upper', label: 'Una mayúscula', ok: true },
      { id: 'number', label: 'Un número', ok: true },
    ]);
  });
});

describe('validatePasswordChange', () => {
  it('válido → sin errores', () => {
    expect(validatePasswordChange(okValues)).toEqual({});
  });

  it('actual vacía → "Ingresá tu contraseña actual"', () => {
    expect(validatePasswordChange({ ...okValues, current_password: '' })).toEqual({
      current_password: 'Ingresá tu contraseña actual',
    });
  });

  it.each(['corta1A', 'sinmayuscula1', 'SinNumeroAca'])('"%s" no cumple las reglas', (pw) => {
    expect(validatePasswordChange({ ...okValues, new_password: pw, repeat: pw })).toEqual({
      new_password: RULES_MESSAGE,
    });
  });

  it('igual a la actual → "Tiene que ser distinta de la actual"', () => {
    const values = { current_password: 'Nuev4clave', new_password: 'Nuev4clave', repeat: 'Nuev4clave' };
    expect(validatePasswordChange(values)).toEqual({ new_password: 'Tiene que ser distinta de la actual' });
  });

  it('repetir distinta → "Las contraseñas no coinciden" en repeat', () => {
    expect(validatePasswordChange({ ...okValues, repeat: 'Otra4clave' })).toEqual({
      repeat: 'Las contraseñas no coinciden',
    });
  });

  it('junta los errores de varios campos', () => {
    expect(validatePasswordChange({ current_password: '', new_password: 'x', repeat: 'y' })).toEqual({
      current_password: 'Ingresá tu contraseña actual',
      new_password: RULES_MESSAGE,
      repeat: 'Las contraseñas no coinciden',
    });
  });
});
