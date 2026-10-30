import { describe, expect, it } from 'vitest';
import { DEFAULT_RANGE, RANGES, rangeFor } from '@/utils/progress/ranges';

describe('rangeFor', () => {
  it('expone los rangos y el valor por defecto', () => {
    expect(RANGES.map((r) => r.value)).toEqual(['1m', '3m', 'all']);
    expect(DEFAULT_RANGE).toBe('3m');
  });

  it('"all" no acota', () => {
    expect(rangeFor('all')).toEqual({ from: null, to: null });
  });

  it('3m resta 3 meses y retrocede al lunes (29/07 es miércoles → lunes 27/07)', () => {
    expect(rangeFor('3m', new Date('2026-10-29T15:00:00Z'))).toEqual({ from: '2026-07-27', to: '2026-10-29' });
  });

  it('1m resta 1 mes y retrocede al lunes (29/09 es martes → lunes 28/09)', () => {
    expect(rangeFor('1m', new Date('2026-10-29T15:00:00Z'))).toEqual({ from: '2026-09-28', to: '2026-10-29' });
  });

  it('con hoy en lunes, from igual cae en lunes', () => {
    // 26/10 y 02/11 son lunes; 17/08 también (17/07 es viernes → lunes 13/07).
    expect(rangeFor('1m', new Date('2026-10-26T15:00:00Z')).from).toBe('2026-09-21');
    expect(rangeFor('1m', new Date('2026-11-02T15:00:00Z')).from).toBe('2026-09-28');
    expect(rangeFor('1m', new Date('2026-08-17T15:00:00Z')).from).toBe('2026-07-13');
  });

  it('borde de medianoche AR: 02:30Z del 30/10 todavía es 29/10 en Argentina', () => {
    expect(rangeFor('1m', new Date('2026-10-30T02:30:00Z')).to).toBe('2026-10-29');
    expect(rangeFor('1m', new Date('2026-10-30T03:00:00Z')).to).toBe('2026-10-30');
  });

  it('cruza el año y acota el día al último del mes de destino', () => {
    expect(rangeFor('3m', new Date('2026-01-15T15:00:00Z'))).toEqual({ from: '2025-10-13', to: '2026-01-15' });
    // 31/03 − 1 mes = 28/02/2026 (sábado) → lunes 23/02
    expect(rangeFor('1m', new Date('2026-03-31T15:00:00Z'))).toEqual({ from: '2026-02-23', to: '2026-03-31' });
  });
});
