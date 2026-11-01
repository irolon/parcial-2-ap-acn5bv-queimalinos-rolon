import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHALLENGE_FORM,
  GOAL_OPTIONS,
  toChallengeBody,
  toNumber,
  validateChallengeForm,
} from '@/utils/challenges/challengeForm';

const valid = { ...DEFAULT_CHALLENGE_FORM, name: 'Mes de fuerza', goal_value: '12' };

describe('validateChallengeForm', () => {
  it('un formulario válido no tiene errores', () => {
    expect(validateChallengeForm(valid)).toEqual({});
  });

  it.each([
    ['nombre vacío', { name: '   ' }, 'name'],
    ['nombre de 101', { name: 'a'.repeat(101) }, 'name'],
    ['valor 0', { goal_value: '0' }, 'goal_value'],
    ['valor negativo', { goal_value: '-3' }, 'goal_value'],
    ['valor vacío', { goal_value: '' }, 'goal_value'],
    ['duración 0', { duration_days: '0' }, 'duration_days'],
    ['duración 366', { duration_days: '366' }, 'duration_days'],
    ['duración 2,5', { duration_days: '2,5' }, 'duration_days'],
    ['descripción de 1001', { description: 'a'.repeat(1001) }, 'description'],
  ])('%s → error en %s', (_, overrides, field) => {
    const errors = validateChallengeForm({ ...valid, ...overrides });
    expect(Object.keys(errors)).toEqual([field]);
    expect(errors[field]).toEqual(expect.any(String));
  });

  it('acepta decimales con coma en el valor', () => {
    expect(validateChallengeForm({ ...valid, goal_type: 'weight_target', goal_value: '72,5' })).toEqual({});
  });
});

describe('toNumber (es-AR)', () => {
  it.each([
    ['10.000', 10000],
    ['1.500', 1500],
    ['72,5', 72.5],
    ['10.000,5', 10000.5],
    ['1,5', 1.5],
    ['15', 15],
    [' 15 ', 15],
  ])('%s → %s', (text, expected) => {
    expect(toNumber(text)).toBe(expected);
  });

  it.each(['', '  ', 'abc', '1,2,3', '1.2.3', '72.5', '10..000', '1.50', '12a'])('inválido %j → NaN', (text) => {
    expect(toNumber(text)).toBeNaN();
  });

  it('el punto de miles no se toma como decimal al validar ni al armar el body', () => {
    const values = { ...valid, goal_type: 'volume', goal_value: '10.000' };
    expect(validateChallengeForm(values)).toEqual({});
    expect(toChallengeBody(values, null).goal_value).toBe(10000);
  });
});

describe('goal_value entero en sesiones y racha', () => {
  it.each(['sessions_count', 'streak'])('%s rechaza decimales', (goal_type) => {
    const errors = validateChallengeForm({ ...valid, goal_type, goal_value: '2,5' });
    expect(Object.keys(errors)).toEqual(['goal_value']);
    expect(errors.goal_value).toMatch(/entero/);
  });

  it('volumen y peso objetivo aceptan decimales', () => {
    expect(validateChallengeForm({ ...valid, goal_type: 'volume', goal_value: '2,5' })).toEqual({});
    expect(validateChallengeForm({ ...valid, goal_type: 'weight_target', goal_value: '72,5' })).toEqual({});
  });
});

describe('toChallengeBody', () => {
  it('con premio usa el id de CHALLENGE_DONE; descripción vacía → null; duración por defecto 30', () => {
    expect(toChallengeBody(valid, 'a-done')).toEqual({
      name: 'Mes de fuerza',
      goal_type: 'sessions_count',
      goal_value: 12,
      duration_days: 30,
      reward_achievement_id: 'a-done',
      description: null,
    });
  });

  it('sin premio manda null', () => {
    expect(toChallengeBody({ ...valid, reward: false }, 'a-done').reward_achievement_id).toBeNull();
  });

  it('si el catálogo no tiene CHALLENGE_DONE manda null', () => {
    expect(toChallengeBody(valid, undefined).reward_achievement_id).toBeNull();
  });

  it('recorta nombre y descripción y convierte la coma', () => {
    const body = toChallengeBody({ ...valid, name: ' Bajar ', goal_value: '72,5', description: ' Dale ' }, null);
    expect(body).toMatchObject({ name: 'Bajar', goal_value: 72.5, description: 'Dale' });
  });
});

describe('GOAL_OPTIONS', () => {
  it('tiene los 4 tipos con ayuda y unidad', () => {
    expect(GOAL_OPTIONS.map((o) => o.value)).toEqual(['sessions_count', 'streak', 'volume', 'weight_target']);
    for (const option of GOAL_OPTIONS) {
      expect(option).toEqual({ value: option.value, label: expect.any(String), unit: expect.any(String), hint: expect.any(String) });
    }
  });
});
