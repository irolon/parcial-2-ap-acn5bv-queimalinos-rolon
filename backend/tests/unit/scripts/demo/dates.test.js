import { addDays, atLocal, localDateOf, weekdayName, nextWeekday } from '../../../../scripts/demo/dates.js';

describe('demo — fechas en horario de Argentina', () => {
  it('localDateOf usa la fecha argentina (UTC-3), no la UTC', () => {
    expect(localDateOf(new Date('2026-11-18T02:00:00Z'))).toBe('2026-11-17');
    expect(localDateOf(new Date('2026-11-18T03:00:00Z'))).toBe('2026-11-18');
  });

  it('addDays cruza meses y años', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('weekdayName devuelve el día en el formato de las rutinas', () => {
    expect(weekdayName('2026-11-18')).toBe('wednesday');
    expect(weekdayName('2026-11-22')).toBe('sunday');
  });

  it('atLocal arma el instante UTC de una hora argentina', () => {
    expect(atLocal('2026-11-18', 19)).toBe('2026-11-18T22:00:00.000Z');
    expect(atLocal('2026-11-18', 22, 30)).toBe('2026-11-19T01:30:00.000Z');
  });

  it('nextWeekday busca el próximo día pedido, hoy incluido o no', () => {
    expect(nextWeekday('2026-11-18', 'wednesday')).toBe('2026-11-25');
    expect(nextWeekday('2026-11-18', 'wednesday', { includeToday: true })).toBe('2026-11-18');
    expect(nextWeekday('2026-11-18', 'thursday')).toBe('2026-11-19');
  });
});
