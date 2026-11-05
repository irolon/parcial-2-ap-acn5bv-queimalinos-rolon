import { argDayRange, eachDay } from '../../../../../src/shared/utils/dates/ranges.js';

describe('argDayRange', () => {
  it('va del 00:00 AR de from al 00:00 AR del día siguiente a to', () => {
    const { fromUtc, toUtc } = argDayRange('2026-11-02', '2026-11-08');
    expect(fromUtc.toISOString()).toBe('2026-11-02T03:00:00.000Z');
    expect(toUtc.toISOString()).toBe('2026-11-09T03:00:00.000Z');
  });

  it('un solo día cubre 24 horas', () => {
    const { fromUtc, toUtc } = argDayRange('2026-11-02', '2026-11-02');
    expect(toUtc - fromUtc).toBe(86_400_000);
  });
});

describe('eachDay', () => {
  it('lista los días inclusivos', () => {
    expect(eachDay('2026-11-01', '2026-11-03')).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
  });

  it('cruza meses y años', () => {
    expect(eachDay('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  });

  it('un solo día, y vacío si to es anterior a from', () => {
    expect(eachDay('2026-11-01', '2026-11-01')).toEqual(['2026-11-01']);
    expect(eachDay('2026-11-02', '2026-11-01')).toEqual([]);
  });
});
