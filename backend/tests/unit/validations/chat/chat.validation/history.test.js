import { describe, it, expect } from '@jest/globals';
import { validateHistoryQuery } from '../../../../../src/validations/chat/chat.validation.js';

const fieldsOf = (query) => {
  try {
    validateHistoryQuery(query);
  } catch (err) {
    expect(err).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    return err.details.map((d) => d.field);
  }
  throw new Error('no lanzó');
};

describe('chat.validation · validateHistoryQuery', () => {
  it('sin nada: 7 días y sin before (el servicio usa hoy)', () => {
    expect(validateHistoryQuery({})).toEqual({ days: 7 });
  });

  it('before real y days de 1 a 14 (llegan como texto); lo demás se descarta', () => {
    expect(validateHistoryQuery({ before: '2026-11-05', days: '14', otro: 'x' })).toEqual({ before: '2026-11-05', days: 14 });
    expect(validateHistoryQuery({ days: '1' })).toEqual({ days: 1 });
  });

  it.each([['2026-02-30'], ['05/11/2026'], ['2026-11-05T00:00:00Z'], ['']])('before %p → 400', (before) => {
    expect(fieldsOf({ before })).toEqual(['before']);
  });

  it.each([['0'], ['15'], ['abc'], ['7.5'], ['-1']])('days %p → 400', (days) => {
    expect(fieldsOf({ days })).toEqual(['days']);
  });

  it('los dos mal: avisa los dos', () => {
    expect(fieldsOf({ before: 'ayer', days: '99' })).toEqual(['before', 'days']);
  });
});
