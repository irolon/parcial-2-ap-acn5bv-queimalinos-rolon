import { describe, expect, it } from 'vitest';
import { dayKey, dayLabel, listTimeLabel, timeLabel } from '@/utils/messages/messageTime';

// 31/10/2026 14:05 en Buenos Aires (UTC-3) = 17:05 UTC.
const NOW = new Date('2026-10-31T17:05:00Z');

describe('timeLabel', () => {
  it('muestra la hora en Buenos Aires, no la del dispositivo', () => {
    expect(timeLabel('2026-10-31T17:05:00.123456+00:00')).toBe('14:05');
    expect(timeLabel('2026-10-31T03:00:00Z')).toBe('00:00');
  });
});

describe('dayLabel', () => {
  it('Hoy, Ayer y fecha corta', () => {
    expect(dayLabel('2026-10-31T10:00:00Z', NOW)).toBe('Hoy');
    expect(dayLabel('2026-10-30T10:00:00Z', NOW)).toBe('Ayer');
    expect(dayLabel('2026-10-12T10:00:00Z', NOW)).toBe('12 oct');
  });

  it('el día cambia a las 00:00 de Buenos Aires (03:00 UTC)', () => {
    expect(dayLabel('2026-10-31T02:59:00Z', NOW)).toBe('Ayer');
    expect(dayLabel('2026-10-31T03:00:00Z', NOW)).toBe('Hoy');
  });

  it('a las 22:30 de Buenos Aires ya es el día siguiente en UTC pero sigue siendo el mismo día', () => {
    const late = new Date('2026-11-01T01:30:00Z');
    expect(dayLabel('2026-10-31T17:00:00Z', late)).toBe('Hoy');
    expect(dayLabel('2026-10-30T17:00:00Z', late)).toBe('Ayer');
  });

  it('cruza fin de mes y de año', () => {
    expect(dayLabel('2026-12-31T15:00:00Z', new Date('2027-01-01T15:00:00Z'))).toBe('Ayer');
    expect(dayLabel('2026-12-30T15:00:00Z', new Date('2027-01-01T15:00:00Z'))).toBe('30 dic');
    expect(dayLabel('2026-09-05T15:00:00Z', NOW)).toBe('5 sep');
  });
});

describe('listTimeLabel', () => {
  it('hora si es de hoy, Ayer o fecha corta', () => {
    expect(listTimeLabel('2026-10-31T17:05:00Z', NOW)).toBe('14:05');
    expect(listTimeLabel('2026-10-30T17:05:00Z', NOW)).toBe('Ayer');
    expect(listTimeLabel('2026-10-12T17:05:00Z', NOW)).toBe('12 oct');
  });
});

describe('dayKey', () => {
  it('agrupa por día de Buenos Aires', () => {
    expect(dayKey('2026-10-31T02:59:00Z')).toBe('2026-10-30');
    expect(dayKey('2026-10-31T03:00:00Z')).toBe('2026-10-31');
  });
});
