import { round1 } from '../../../../src/shared/utils/numbers.js';

describe('round1', () => {
  it('redondea a un decimal, acepta strings y null', () => {
    expect(round1(79.1666)).toBe(79.2);
    expect(round1('80.04')).toBe(80);
    expect(round1(null)).toBeNull();
    expect(round1(undefined)).toBeNull();
  });

  it('devuelve null para vacío o no numérico', () => {
    expect(round1('')).toBeNull();
    expect(round1('abc')).toBeNull();
  });
});
