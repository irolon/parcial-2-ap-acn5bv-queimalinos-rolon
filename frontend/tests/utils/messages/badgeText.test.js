import { describe, expect, it } from 'vitest';
import { badgeText } from '@/utils/messages/badgeText';

describe('badgeText', () => {
  it('oculto en 0, número hasta 9 y "9+" desde 10', () => {
    expect(badgeText(0)).toBeNull();
    expect(badgeText(undefined)).toBeNull();
    expect(badgeText(1)).toBe('1');
    expect(badgeText(9)).toBe('9');
    expect(badgeText(10)).toBe('9+');
    expect(badgeText(120)).toBe('9+');
  });
});
