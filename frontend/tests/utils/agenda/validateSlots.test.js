import { describe, expect, it } from 'vitest';
import { validateSlots } from '@/utils/agenda';

const slot = (weekday, start_time, end_time) => ({ weekday, start_time, end_time });

describe('validateSlots', () => {
  it('sin errores devuelve un mapa vacío', () => {
    expect(validateSlots([])).toEqual({});
    expect(validateSlots([slot(1, '09:00', '13:00'), slot(1, '13:00', '15:00'), slot(2, '09:00', '13:00')])).toEqual({});
  });

  it('weekday fuera de 1-7 o no entero', () => {
    const msg = 'weekday debe ser un entero entre 1 (lunes) y 7 (domingo)';
    const result = validateSlots([slot(0, '09:00', '10:00'), slot(8, '09:00', '10:00'), slot(1.5, '09:00', '10:00')]);
    expect(result).toEqual({ 0: msg, 1: msg, 2: msg });
  });

  it('horas que no son en punto o con formato inválido', () => {
    expect(validateSlots([slot(1, '09:30', '10:00')])).toEqual({ 0: 'start_time debe ser una hora en punto con formato HH:00' });
    expect(validateSlots([slot(1, '09:00', '24:00')])).toEqual({ 0: 'end_time debe ser una hora en punto con formato HH:00' });
    expect(validateSlots([slot(1, '9:00', '10:00')])[0]).toMatch(/^start_time/);
  });

  it('inicio igual o posterior al fin', () => {
    const msg = 'La hora de inicio tiene que ser anterior a la de fin';
    expect(validateSlots([slot(1, '10:00', '10:00'), slot(1, '12:00', '11:00')])).toEqual({ 0: msg, 1: msg });
  });

  it('marca las dos franjas superpuestas del mismo día y no las de otro día ni las que se tocan', () => {
    const msg = 'La franja se superpone con otra del mismo día';
    const result = validateSlots([slot(1, '09:00', '12:00'), slot(1, '11:00', '14:00'), slot(2, '09:00', '12:00'), slot(1, '14:00', '15:00')]);
    expect(result).toEqual({ 0: msg, 1: msg });
  });

  it('una franja inválida no se compara por superposición', () => {
    const result = validateSlots([slot(1, '09:00', '12:00'), slot(1, '10:30', '11:00')]);
    expect(Object.keys(result)).toEqual(['1']);
  });

  it('el elemento que no es objeto', () => {
    expect(validateSlots([null, 'x'])).toEqual({ 0: 'la franja debe ser un objeto', 1: 'la franja debe ser un objeto' });
  });

  it('más de 50 franjas', () => {
    const many = Array.from({ length: 51 }, () => slot(1, '09:00', '10:00'));
    expect(validateSlots(many).slots).toBe('slots admite hasta 50 franjas');
  });
});
