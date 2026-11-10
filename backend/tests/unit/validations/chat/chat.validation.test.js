import { describe, it, expect } from '@jest/globals';
import { validateChatBody } from '../../../../src/validations/chat/chat.validation.js';

const ID = '11111111-1111-4111-8111-111111111111';
const EX = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const fieldsOf = (fn) => {
  try {
    fn();
  } catch (err) {
    expect(err).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    return err.details.map((d) => d.field);
  }
  throw new Error('no lanzó');
};

describe('chat.validation · validateChatBody', () => {
  it('mensaje solo: lo recorta y no agrega los opcionales', () => {
    expect(validateChatBody({ message: '  ¿Con qué reemplazo el press?  ' })).toEqual({
      message: '¿Con qué reemplazo el press?',
    });
  });

  it('con session_id y current_exercise_id', () => {
    expect(validateChatBody({ message: 'hola', session_id: ID, current_exercise_id: EX })).toEqual({
      message: 'hola',
      session_id: ID,
      current_exercise_id: EX,
    });
  });

  it('null en los opcionales cuenta como no enviado', () => {
    expect(validateChatBody({ message: 'hola', session_id: null, current_exercise_id: null })).toEqual({ message: 'hola' });
  });

  it('descarta los campos de más, incluido el context.gym_equipment del contrato viejo', () => {
    const out = validateChatBody({ message: 'hola', context: { gym_equipment: ['barbell'] }, role: 'assistant' });
    expect(out).toEqual({ message: 'hola' });
  });

  it.each([[undefined], [''], ['   '], [42], [['hola']]])('message %p → 400 message', (message) => {
    expect(fieldsOf(() => validateChatBody({ message }))).toEqual(['message']);
  });

  it('message de 500 pasa y de 501 no (se cuenta recortado)', () => {
    expect(validateChatBody({ message: `${'a'.repeat(500)}  ` }).message).toHaveLength(500);
    expect(fieldsOf(() => validateChatBody({ message: 'a'.repeat(501) }))).toEqual(['message']);
  });

  it('ids inválidos → 400 con cada campo', () => {
    expect(fieldsOf(() => validateChatBody({ message: 'hola', session_id: 'x', current_exercise_id: 3 }))).toEqual([
      'session_id',
      'current_exercise_id',
    ]);
  });
});
