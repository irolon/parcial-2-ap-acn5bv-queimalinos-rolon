import { validateAvailabilityBody } from '../../../../src/validations/agenda/availability.validation.js';

const slot = (weekday, start_time, end_time) => ({ weekday, start_time, end_time });
const detailsOf = (fn) => {
  try {
    fn();
  } catch (e) {
    expect(e).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    return e.details;
  }
  throw new Error('no tiró');
};

describe('validateAvailabilityBody', () => {
  it('acepta una lista vacía y varias franjas, incluso pegadas en el borde', () => {
    expect(validateAvailabilityBody({ slots: [] })).toEqual({ slots: [] });
    const slots = [slot(1, '08:00', '12:00'), slot(1, '12:00', '14:00'), slot(2, '08:00', '09:00')];
    expect(validateAvailabilityBody({ slots })).toEqual({ slots });
  });

  it('rechaza slots que no es lista o pasa de 50', () => {
    expect(detailsOf(() => validateAvailabilityBody({}))[0].field).toBe('slots');
    expect(detailsOf(() => validateAvailabilityBody(undefined))[0].field).toBe('slots');
    // 7 días × 8 horas sueltas alcanzan para armar 51 franjas sin solaparse.
    const hh = (h) => `${String(h).padStart(2, '0')}:00`;
    const many = Array.from({ length: 51 }, (_, i) => slot((i % 7) + 1, hh(8 + Math.floor(i / 7)), hh(9 + Math.floor(i / 7))));
    expect(detailsOf(() => validateAvailabilityBody({ slots: many }))[0].field).toBe('slots');
    expect(validateAvailabilityBody({ slots: many.slice(0, 50) }).slots).toHaveLength(50);
  });

  it.each([0, 8, 1.5, '1', null])('rechaza weekday %p', (weekday) => {
    const d = detailsOf(() => validateAvailabilityBody({ slots: [slot(weekday, '08:00', '09:00')] }));
    expect(d).toEqual([expect.objectContaining({ field: 'slots[0].weekday' })]);
  });

  it.each(['8:00', '08:30', '08:00:00', '24:00', 800, null])('rechaza hora %p que no es HH:00', (t) => {
    const d = detailsOf(() => validateAvailabilityBody({ slots: [slot(1, t, '23:00')] }));
    expect(d).toEqual([expect.objectContaining({ field: 'slots[0].start_time' })]);
  });

  it('rechaza inicio igual o posterior al fin', () => {
    for (const s of [slot(1, '10:00', '10:00'), slot(1, '12:00', '09:00')]) {
      const d = detailsOf(() => validateAvailabilityBody({ slots: [s] }));
      expect(d).toEqual([expect.objectContaining({ field: 'slots[0].end_time' })]);
    }
  });

  it('rechaza una franja que no es objeto', () => {
    expect(detailsOf(() => validateAvailabilityBody({ slots: ['x'] }))[0].field).toBe('slots[0]');
  });

  it('informa por franja las que se superponen el mismo día', () => {
    const slots = [slot(1, '08:00', '12:00'), slot(2, '08:00', '12:00'), slot(1, '11:00', '14:00'), slot(1, '14:00', '16:00')];
    const d = detailsOf(() => validateAvailabilityBody({ slots }));
    expect(d.map((x) => x.field)).toEqual(['slots[0]', 'slots[2]']);
    expect(d[0].message).toMatch(/superpone/);
  });

  it('el mismo horario repetido es un solapamiento', () => {
    const d = detailsOf(() => validateAvailabilityBody({ slots: [slot(3, '08:00', '09:00'), slot(3, '08:00', '09:00')] }));
    expect(d.map((x) => x.field)).toEqual(['slots[0]', 'slots[1]']);
  });

  it('acumula errores de varias franjas', () => {
    const d = detailsOf(() => validateAvailabilityBody({ slots: [slot(9, '08:00', '09:00'), slot(1, '09:00', '08:00')] }));
    expect(d.map((x) => x.field)).toEqual(['slots[0].weekday', 'slots[1].end_time']);
  });
});
