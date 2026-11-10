import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { validateProposal } from '../../../../src/services/trainer-ai/proposal.js';

const EX1 = '11111111-1111-4111-8111-111111111111';
const EX2 = '22222222-2222-4222-8222-222222222222';
const FAKE = '33333333-3333-4333-8333-333333333333';
const LIBRARY = new Set([EX1, EX2]);
const item = (patch = {}) => ({
  exercise_id: EX1,
  sets: 4,
  reps: 8,
  rest_seconds: 90,
  suggested_kg: null,
  notes: 'Bajada controlada',
  ...patch,
});
const block = (patch = {}) => ({ name: 'Empuje', days: ['monday', 'thursday'], exercises: [item()], ...patch });
const proposal = (patch = {}) => ({ routines: [block()], rationale: 'Porque sí', ...patch });
const withItem = (patch) => proposal({ routines: [block({ exercises: [item(patch)] })] });
const withBlock = (patch) => proposal({ routines: [block(patch)] });
const check = (raw, frequency = 2) => validateProposal(raw, { frequency, libraryIds: LIBRARY });

const expectInvalid = (raw, frequency) => {
  expect(() => check(raw, frequency)).toThrow(
    expect.objectContaining({ statusCode: 502, code: 'AI_INVALID_RESPONSE' })
  );
};

describe('trainer-ai · validateProposal', () => {
  let warn;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('devuelve la propuesta saneada y descarta los campos de más', () => {
    const raw = proposal({ extra: 1, routines: [block({ color: 'rojo', exercises: [item({ tempo: '3010' })] })] });
    expect(check(raw)).toEqual({
      routines: [{ name: 'Empuje', days: ['monday', 'thursday'], exercises: [item()] }],
      rationale: 'Porque sí',
    });
  });

  it('acepta varios bloques sin días repetidos entre ellos (split)', () => {
    const raw = proposal({
      routines: [
        block({ name: 'A', days: ['monday'] }),
        block({ name: 'B', days: ['wednesday', 'friday'], exercises: [item({ exercise_id: EX2 })] }),
      ],
    });
    expect(check(raw, 3).routines).toHaveLength(2);
  });

  it('notes y suggested_kg ausentes quedan en null; suggested_kg numérico se conserva', () => {
    const { notes: _n, suggested_kg: _k, ...bare } = item();
    const raw = proposal({ routines: [block({ exercises: [bare, item({ suggested_kg: 42.5 })] })] });
    expect(check(raw).routines[0].exercises).toEqual([
      { ...item(), notes: null, suggested_kg: null },
      item({ suggested_kg: 42.5 }),
    ]);
  });

  it('la respuesta de n8n cuando el LLM no devolvió JSON ({ error: INVALID_JSON }) es inválida', () => {
    expectInvalid({ error: 'INVALID_JSON' });
  });

  it.each([
    ['no es un objeto', null],
    ['routines vacío', proposal({ routines: [] })],
    ['más de 7 bloques', proposal({ routines: Array.from({ length: 8 }, () => block({ days: ['monday'] })) })],
    ['name vacío', withBlock({ name: '' })],
    ['name de más de 60', withBlock({ name: 'x'.repeat(61) })],
    ['days vacío', withBlock({ days: [] })],
    ['día inexistente', withBlock({ days: ['lunes', 'monday'] })],
    ['días repetidos en un bloque', withBlock({ days: ['monday', 'monday'] })],
    ['sin ejercicios', withBlock({ exercises: [] })],
    ['más de 15 ejercicios', withBlock({ exercises: Array.from({ length: 16 }, () => item()) })],
    ['ejercicio inventado (fuera de la biblioteca)', withItem({ exercise_id: FAKE })],
    ['"sets": "cuatro"', withItem({ sets: 'cuatro' })],
    ['sets 0', withItem({ sets: 0 })],
    ['sets 11', withItem({ sets: 11 })],
    ['reps 51', withItem({ reps: 51 })],
    ['reps decimal', withItem({ reps: 8.5 })],
    ['rest_seconds 601', withItem({ rest_seconds: 601 })],
    ['rest_seconds ausente', withItem({ rest_seconds: undefined })],
    ['suggested_kg 501', withItem({ suggested_kg: 501 })],
    ['suggested_kg texto', withItem({ suggested_kg: '40' })],
    ['notes de más de 200', withItem({ notes: 'x'.repeat(201) })],
    ['rationale vacío', proposal({ rationale: '' })],
    ['rationale de más de 1000', proposal({ rationale: 'x'.repeat(1001) })],
  ])('rechaza: %s', (_label, raw) => {
    expectInvalid(raw);
  });

  it('rechaza días repetidos entre bloques', () => {
    const raw = proposal({
      routines: [block({ name: 'A', days: ['monday'] }), block({ name: 'B', days: ['monday', 'friday'] })],
    });
    expectInvalid(raw, 3);
  });

  it('rechaza si el total de días no es igual a la frecuencia', () => {
    expectInvalid(proposal(), 3);
  });

  it('los detalles van al log, no al error del cliente', () => {
    expect.assertions(2);
    try {
      check(proposal({ rationale: '' }));
    } catch (err) {
      expect(err.details).toEqual([]);
    }
    expect(warn).toHaveBeenCalledWith(
      '[trainer-ai] propuesta inválida de n8n',
      expect.arrayContaining([expect.stringContaining('rationale')])
    );
  });
});
