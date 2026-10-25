import { describe, expect, it } from 'vitest';
import { localInputValue, pad, todayString } from '@/utils/dates';

describe('dates', () => {
  it('pad completa a dos dígitos', () => {
    expect(pad(5)).toBe('05');
    expect(pad(12)).toBe('12');
  });

  it('todayString da aaaa-mm-dd en hora local', () => {
    expect(todayString(new Date(2026, 0, 9, 23, 59))).toBe('2026-01-09');
  });

  it('localInputValue da aaaa-mm-ddThh:mm en hora local', () => {
    expect(localInputValue(new Date(2026, 9, 5, 8, 7))).toBe('2026-10-05T08:07');
  });
});
