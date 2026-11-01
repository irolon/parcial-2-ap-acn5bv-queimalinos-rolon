import { describe, expect, it } from 'vitest';
import { positiveKg, suggestedKg } from '@/utils/routines/suggestedKg';

describe('positiveKg', () => {
  it.each([
    [62.5, 62.5],
    [0.5, 0.5],
    ['62.5', 62.5],
    [0, null],
    [-5, null],
    [null, null],
    [undefined, null],
    ['', null],
    ['abc', null],
    [Number.NaN, null],
    [Number.POSITIVE_INFINITY, null],
  ])('%j → %j', (kg, expected) => {
    expect(positiveKg(kg)).toBe(expected);
  });
});

describe('suggestedKg: el peso que se propone, campo por campo y después el siguiente', () => {
  it.each([
    ['la última sesión gana al sugerido', { last_session_kg: 62.5, suggested_kg: 60 }, 62.5],
    ['sin última sesión, el sugerido', { last_session_kg: null, suggested_kg: 60 }, 60],
    ['última sesión en 0 (peso corporal en el celular) no tapa al sugerido', { last_session_kg: 0, suggested_kg: 20 }, 20],
    ['última sesión en 0 y sin sugerido: peso corporal', { last_session_kg: 0, suggested_kg: null }, null],
    ['sugerido en 0: peso corporal', { last_session_kg: null, suggested_kg: 0 }, null],
    ['los dos en 0', { last_session_kg: 0, suggested_kg: 0 }, null],
    ['ninguno', { last_session_kg: null, suggested_kg: null }, null],
    ['rutina de /mine (sin last_session_kg)', { suggested_kg: 40 }, 40],
  ])('%s', (_, exercise, expected) => {
    expect(suggestedKg(exercise)).toBe(expected);
  });

  it('sin ejercicio, null', () => {
    expect(suggestedKg(undefined)).toBeNull();
    expect(suggestedKg(null)).toBeNull();
  });
});
