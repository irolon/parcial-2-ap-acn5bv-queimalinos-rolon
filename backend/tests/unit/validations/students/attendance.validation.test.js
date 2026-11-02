import { jest } from '@jest/globals';
import { validateAttendanceQuery } from '../../../../src/validations/students/attendance.validation.js';

describe('validateAttendanceQuery', () => {
  beforeEach(() => {
    // 30/11 22:00 en Argentina = 01/12 01:00Z: el mes actual sigue siendo noviembre.
    jest.useFakeTimers({ now: new Date('2026-12-01T01:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
  });
  afterEach(() => jest.useRealTimers());

  it('sin month usa el mes actual en hora argentina', () => {
    expect(validateAttendanceQuery({})).toEqual({ month: '2026-11' });
  });

  it('acepta el mes actual y los anteriores', () => {
    expect(validateAttendanceQuery({ month: '2026-11' })).toEqual({ month: '2026-11' });
    expect(validateAttendanceQuery({ month: '2025-02' })).toEqual({ month: '2025-02' });
  });

  it('mes futuro → 400', () => {
    expect(() => validateAttendanceQuery({ month: '2026-12' })).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it('año con ceros adelante o anterior a 2020 → 400', () => {
    for (const month of ['0999-01', '1999-12', '2019-12']) {
      expect(() => validateAttendanceQuery({ month })).toThrow(expect.objectContaining({ statusCode: 400 }));
    }
    expect(validateAttendanceQuery({ month: '2020-01' })).toEqual({ month: '2020-01' });
  });

  it('formato inválido → 400', () => {
    for (const month of ['2026-13', '2026-1', 'noviembre', '2026-11-01']) {
      expect(() => validateAttendanceQuery({ month })).toThrow(expect.objectContaining({ statusCode: 400 }));
    }
  });
});
