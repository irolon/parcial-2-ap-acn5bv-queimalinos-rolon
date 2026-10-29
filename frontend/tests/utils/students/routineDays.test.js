import { describe, expect, it } from 'vitest';
import { DAY_OPTIONS, formatRoutineDays, sortDays } from '@/utils/students/routineDays';

describe('routineDays', () => {
  it('DAY_OPTIONS va de lunes a domingo con inicial y nombre', () => {
    expect(DAY_OPTIONS.map((d) => d.value)).toEqual([
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    ]);
    expect(DAY_OPTIONS.map((d) => d.short).join('')).toBe('LMXJVSD');
    expect(DAY_OPTIONS[0]).toEqual({ value: 'monday', short: 'L', label: 'Lunes' });
  });

  it('formatRoutineDays traduce y deja los desconocidos tal cual', () => {
    expect(formatRoutineDays(['monday', 'sunday', 'otro'])).toBe('Lunes · Domingo · otro');
    expect(formatRoutineDays()).toBe('');
  });

  it('sortDays ordena de lunes a domingo sin tocar el original', () => {
    const days = ['sunday', 'otro', 'monday'];
    expect(sortDays(days)).toEqual(['monday', 'sunday', 'otro']);
    expect(days[0]).toBe('sunday');
    expect(sortDays()).toEqual([]);
  });
});
