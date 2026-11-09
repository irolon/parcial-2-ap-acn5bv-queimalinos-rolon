import { describe, expect, it } from 'vitest';
import { nextAppointment, nextAppointmentLabel, nextDaysRange } from '@/utils/agenda/nextAppointment';
import { NOW, appt } from '../../helpers/agenda/fixtures';

// NOW: miércoles 04/11/2026 12:00 en Argentina.
const now = new Date(NOW);

describe('nextAppointment', () => {
  it('el más cercano entre los pendientes y confirmados que todavía no pasaron', () => {
    const list = [
      appt({ id: 'lejos', scheduled_at: '2026-11-10T21:00:00.000Z', status: 'confirmed' }),
      appt({ id: 'cerca', scheduled_at: '2026-11-05T12:00:00.000Z', status: 'pending' }),
    ];
    expect(nextAppointment(list, now).id).toBe('cerca');
  });

  it('ignora los cancelados y los que ya pasaron (incluido uno de hoy más temprano)', () => {
    const list = [
      appt({ id: 'cancelado', scheduled_at: '2026-11-05T12:00:00.000Z', status: 'cancelled' }),
      appt({ id: 'pasado', scheduled_at: '2026-11-04T12:00:00.000Z', status: 'confirmed' }),
      appt({ id: 'justo', scheduled_at: NOW, status: 'confirmed' }),
      appt({ id: 'ok', scheduled_at: '2026-11-06T21:00:00.000Z', status: 'confirmed' }),
    ];
    expect(nextAppointment(list, now).id).toBe('ok');
  });

  it('null sin turnos o sin ninguno que sirva', () => {
    expect(nextAppointment([], now)).toBeNull();
    expect(nextAppointment(undefined, now)).toBeNull();
    expect(nextAppointment([appt({ status: 'cancelled' })], now)).toBeNull();
  });
});

describe('nextDaysRange', () => {
  it('de hoy a hoy + 13 en fecha argentina', () => {
    expect(nextDaysRange(now, 14)).toEqual({ from: '2026-11-04', to: '2026-11-17' });
  });

  it('a las 23:59 del domingo 01/11 en Argentina (ya lunes en UTC) arranca el domingo', () => {
    expect(nextDaysRange(new Date('2026-11-02T02:59:00Z'), 14)).toEqual({ from: '2026-11-01', to: '2026-11-14' });
  });

  it('cruza de mes', () => {
    expect(nextDaysRange(new Date('2026-11-25T15:00:00Z'), 14)).toEqual({ from: '2026-11-25', to: '2026-12-08' });
  });
});

describe('nextAppointmentLabel', () => {
  it('día de la semana, fecha y hora de Argentina', () => {
    expect(nextAppointmentLabel('2026-11-12T21:00:00.000Z')).toBe('Jueves 12/11 · 18:00');
    expect(nextAppointmentLabel('2026-11-06T12:30:00.000Z')).toBe('Viernes 06/11 · 09:30');
  });
});
