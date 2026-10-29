import { describe, expect, it } from 'vitest';
import { formatDuration, formatSessionDate } from '@/utils/sessions/format';

describe('formatSessionDate', () => {
  it('arma día y mes abreviado en mayúsculas, en hora local', () => {
    expect(formatSessionDate(new Date(2026, 3, 22, 18, 30).toISOString())).toBe('22 ABR');
    expect(formatSessionDate(new Date(2026, 0, 5, 9, 0).toISOString())).toBe('5 ENE');
    expect(formatSessionDate(new Date(2026, 11, 31, 23, 59).toISOString())).toBe('31 DIC');
  });

  it('cubre los doce meses', () => {
    const labels = Array.from({ length: 12 }, (_, m) => formatSessionDate(new Date(2026, m, 10, 12).toISOString()));
    expect(labels.map((l) => l.split(' ')[1]).join(' ')).toBe('ENE FEB MAR ABR MAY JUN JUL AGO SEP OCT NOV DIC');
  });
});

describe('formatDuration', () => {
  it('usa la prima U+2032 y — sin duración', () => {
    expect(formatDuration(54)).toBe('54\u2032');
    expect(formatDuration(null)).toBe('—');
  });
});
