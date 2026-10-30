import { isUuid, isIsoDateTime, isRealCalendarDate } from '../../../../src/shared/utils/validators.js';

describe('validators — isUuid', () => {
  it('acepta UUID en cualquier caja y rechaza el resto', () => {
    expect(isUuid('3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c')).toBe(true);
    expect(isUuid('3F1C2B9A-1D2E-4F5A-8B7C-9D0E1F2A3B4C')).toBe(true);
    expect(isUuid('no-es-uuid')).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(5)).toBe(false);
  });
});

describe('validators — isIsoDateTime', () => {
  it('acepta ISO con zona y fecha real', () => {
    expect(isIsoDateTime('2026-10-17T09:30:00-03:00')).toBe(true);
    expect(isIsoDateTime('2026-10-17T09:30:00.123Z')).toBe(true);
    expect(isIsoDateTime('2028-02-29T10:00Z')).toBe(true);
  });

  it('rechaza sin zona, fechas inexistentes y no strings', () => {
    expect(isIsoDateTime('2026-10-17T09:30:00')).toBe(false);
    expect(isIsoDateTime('2026-02-30T10:00:00Z')).toBe(false);
    expect(isIsoDateTime('2026-13-01T10:00:00Z')).toBe(false);
    expect(isIsoDateTime('2026-10-17T24:00:00Z')).toBe(false);
    expect(isIsoDateTime('2026-10-17T09:30:00+25:00')).toBe(false);
    expect(isIsoDateTime('2026-10-17T09:30:00-99:00')).toBe(false);
    expect(isIsoDateTime(1700000000)).toBe(false);
    expect(isIsoDateTime(null)).toBe(false);
  });
});

describe('validators — isRealCalendarDate', () => {
  it('acepta fechas reales YYYY-MM-DD y rechaza inexistentes o mal formadas', () => {
    expect(isRealCalendarDate('2026-10-29')).toBe(true);
    expect(isRealCalendarDate('2028-02-29')).toBe(true);
    expect(isRealCalendarDate('2026-02-30')).toBe(false);
    expect(isRealCalendarDate('29/10/2026')).toBe(false);
    expect(isRealCalendarDate('2026-1-5')).toBe(false);
    expect(isRealCalendarDate(undefined)).toBe(false);
  });
});
