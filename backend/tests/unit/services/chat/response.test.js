import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { validateChatResponse } from '../../../../src/services/chat/response.js';

const EX1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const EX2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const EX3 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
const EX4 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
const INVENTED = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ALTERNATIVES = [
  { id: EX1, name: 'Press con mancuernas', muscle_group: 'chest', equipment: 'dumbbell' },
  { id: EX2, name: 'Flexiones', muscle_group: 'chest', equipment: 'bodyweight' },
  { id: EX3, name: 'Aperturas', muscle_group: 'chest', equipment: 'dumbbell' },
  { id: EX4, name: 'Fondos', muscle_group: 'chest', equipment: 'bodyweight' },
];
const s = (exercise_id, reason = 'Mismo músculo') => ({ exercise_id, reason });
const check = (raw) => validateChatResponse(raw, ALTERNATIVES);
const expect502 = (raw) => expect(() => check(raw)).toThrow(expect.objectContaining({ statusCode: 502, code: 'AI_INVALID_RESPONSE' }));

describe('chat · validateChatResponse', () => {
  let warn;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('respuesta válida: recorta el texto y suma el nombre de cada sugerencia', () => {
    expect(check({ response: '  Probá con mancuernas.  ', suggestions: [s(EX1, ' Mismo patrón ')] })).toEqual({
      response: 'Probá con mancuernas.',
      suggestions: [{ exercise_id: EX1, name: 'Press con mancuernas', reason: 'Mismo patrón' }],
    });
  });

  it('sin suggestions, o con algo que no es lista → sin sugerencias (no se rechaza)', () => {
    expect(check({ response: 'Ok' }).suggestions).toEqual([]);
    expect(check({ response: 'Ok', suggestions: 'EX1' }).suggestions).toEqual([]);
    expect(check({ response: 'Ok', suggestions: null }).suggestions).toEqual([]);
  });

  it('descarta las sugerencias inventadas, sin reason válido, repetidas o que no son objetos', () => {
    const out = check({
      response: 'Ok',
      suggestions: [s(INVENTED), s(EX1, ''), s(EX2, 'x'.repeat(201)), 'EX3', null, s(EX3), s(EX3, 'Repetida'), { reason: 'sin id' }],
    });
    expect(out.suggestions).toEqual([{ exercise_id: EX3, name: 'Aperturas', reason: 'Mismo músculo' }]);
    expect(out.response).toBe('Ok');
  });

  it('se queda con las 3 primeras válidas', () => {
    const out = check({ response: 'Ok', suggestions: [s(INVENTED), s(EX1), s(EX2), s(EX3), s(EX4)] });
    expect(out.suggestions.map((x) => x.exercise_id)).toEqual([EX1, EX2, EX3]);
  });

  it('los campos de más se descartan', () => {
    const out = check({ response: 'Ok', extra: 1, suggestions: [{ ...s(EX1), name: 'Inventado', sets: 3 }] });
    expect(out).toEqual({ response: 'Ok', suggestions: [{ exercise_id: EX1, name: 'Press con mancuernas', reason: 'Mismo músculo' }] });
  });

  it('response de 1500 pasa', () => {
    expect(check({ response: 'a'.repeat(1500) }).response).toHaveLength(1500);
  });

  it.each([
    ['null', null],
    ['una lista', [{ response: 'Ok' }]],
    ['un texto', 'Ok'],
    ['sin response', { suggestions: [] }],
    ['response vacío', { response: '   ' }],
    ['response que no es texto', { response: 42 }],
    ['response de 1501', { response: 'a'.repeat(1501) }],
    ['{ error } de n8n', { error: 'INVALID_JSON' }],
    ['{ error } aunque traiga response', { error: 'LLM_UNAVAILABLE', response: 'Ok' }],
  ])('%s → 502 AI_INVALID_RESPONSE (y se loguea)', (_label, raw) => {
    expect502(raw);
    expect(warn).toHaveBeenCalled();
  });

  it('el 502 trae el mensaje del chat, no el de la propuesta de rutinas', () => {
    expect(() => check(null)).toThrow('El asistente respondió algo inválido. Probá de nuevo.');
  });
});
