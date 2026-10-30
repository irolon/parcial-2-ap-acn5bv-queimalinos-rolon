import { describe, expect, it } from '@jest/globals';
import {
  validateHistoryQuery,
  validateHistoryDetailParams,
  validateCommentBody,
} from '../../../../src/validations/sessions/session-history.validation.js';

const ID = '11111111-1111-4111-8111-111111111111';

describe('validateHistoryQuery', () => {
  it('defaults page 1, limit 20', () => {
    expect(validateHistoryQuery({})).toEqual({ page: 1, limit: 20 });
  });
  it('acepta valores válidos y topea limit en 100', () => {
    expect(validateHistoryQuery({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50 });
    expect(validateHistoryQuery({ limit: '500' }).limit).toBe(100);
  });
  it('inválidos caen al default', () => {
    expect(validateHistoryQuery({ page: '0', limit: '-2' })).toEqual({ page: 1, limit: 20 });
    expect(validateHistoryQuery({ page: 'abc', limit: 'x' })).toEqual({ page: 1, limit: 20 });
  });
});

describe('validateHistoryDetailParams', () => {
  it('acepta uuids y los pasa a minúsculas', () => {
    expect(validateHistoryDetailParams({ id: ID.toUpperCase(), sessionId: ID })).toEqual({
      id: ID, sessionId: ID,
    });
  });
  it('id o sessionId inválido → 400', () => {
    expect(() => validateHistoryDetailParams({ id: 'x', sessionId: ID })).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(() => validateHistoryDetailParams({ id: ID, sessionId: 'x' })).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    );
  });
});

describe('validateCommentBody', () => {
  it('acepta texto y null', () => {
    expect(validateCommentBody({ trainer_comment: 'Bien' })).toEqual({ trainer_comment: 'Bien' });
    expect(validateCommentBody({ trainer_comment: null })).toEqual({ trainer_comment: null });
  });
  it('"" y solo espacios pasan a null; el resto se guarda recortado', () => {
    expect(validateCommentBody({ trainer_comment: '' }).trainer_comment).toBeNull();
    expect(validateCommentBody({ trainer_comment: '  \n ' }).trainer_comment).toBeNull();
    expect(validateCommentBody({ trainer_comment: ' hola ' }).trainer_comment).toBe('hola');
  });
  it('acepta 1000 caracteres y rechaza 1001', () => {
    expect(validateCommentBody({ trainer_comment: 'a'.repeat(1000) }).trainer_comment).toHaveLength(1000);
    expect(() => validateCommentBody({ trainer_comment: 'a'.repeat(1001) })).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR' })
    );
  });
  it.each([[undefined], [5], [true], [{}], [['a']]])('rechaza %p', (v) => {
    expect(() => validateCommentBody({ trainer_comment: v })).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR', details: [expect.objectContaining({ field: 'trainer_comment' })] })
    );
  });
  it('ignora campos extra', () => {
    expect(validateCommentBody({ trainer_comment: 'x', rpe: 3 })).toEqual({ trainer_comment: 'x' });
  });
});
