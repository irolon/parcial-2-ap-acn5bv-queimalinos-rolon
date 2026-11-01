import { validateRangeQuery } from '../../../../src/validations/agenda/range.validation.js';

const detailsOf = (fn) => {
  try {
    fn();
  } catch (e) {
    expect(e).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    return e.details;
  }
  throw new Error('no tiró');
};

describe('validateRangeQuery', () => {
  it('acepta un rango válido', () => {
    expect(validateRangeQuery({ from: '2026-11-01', to: '2026-11-07' }, 31)).toEqual({
      from: '2026-11-01',
      to: '2026-11-07',
    });
    expect(validateRangeQuery({ from: '2026-11-01', to: '2026-11-01' }, 31)).toEqual({
      from: '2026-11-01',
      to: '2026-11-01',
    });
  });

  it('el tope es inclusivo: 31 días sí, 32 no', () => {
    expect(validateRangeQuery({ from: '2026-11-01', to: '2026-12-01' }, 31).to).toBe('2026-12-01');
    expect(detailsOf(() => validateRangeQuery({ from: '2026-11-01', to: '2026-12-02' }, 31))[0].field).toBe('to');
  });

  it('rechaza faltantes, formato y fechas inexistentes', () => {
    expect(detailsOf(() => validateRangeQuery({}, 31)).map((x) => x.field)).toEqual(['from', 'to']);
    expect(detailsOf(() => validateRangeQuery({ from: '2026-02-30', to: '2026-03-01' }, 31))[0].field).toBe('from');
    expect(detailsOf(() => validateRangeQuery({ from: '2026-11-01', to: '1/12/2026' }, 31))[0].field).toBe('to');
  });

  it('rechaza to anterior a from', () => {
    expect(detailsOf(() => validateRangeQuery({ from: '2026-11-05', to: '2026-11-04' }, 62))[0].field).toBe('to');
  });
});
