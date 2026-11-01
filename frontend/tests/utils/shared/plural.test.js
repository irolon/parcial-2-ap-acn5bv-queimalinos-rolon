import { describe, expect, it } from 'vitest';
import { plural } from '@/utils/shared/plural';

describe('plural', () => {
  it('1 va en singular', () => {
    expect(plural(1, 'día', 'días')).toBe('1 día');
  });

  it.each([0, 2, 30])('%s va en plural', (n) => {
    expect(plural(n, 'día', 'días')).toBe(`${n} días`);
  });
});
