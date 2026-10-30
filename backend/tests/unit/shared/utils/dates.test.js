import { localDate } from '../../../../src/shared/utils/dates.js';

describe('localDate', () => {
  it('devuelve el día de Buenos Aires aunque en UTC ya sea el siguiente', () => {
    expect(localDate('2026-10-31T01:30:00Z')).toBe('2026-10-30');
  });

  it('respeta el día cuando UTC y AR coinciden', () => {
    expect(localDate('2026-10-30T15:00:00Z')).toBe('2026-10-30');
  });

  it('acepta Date y timestamps', () => {
    expect(localDate(new Date('2026-01-01T02:59:59Z'))).toBe('2025-12-31');
    expect(localDate(Date.parse('2026-01-01T03:00:00Z'))).toBe('2026-01-01');
  });

  it('sin argumento usa ahora, con formato YYYY-MM-DD', () => {
    expect(localDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
