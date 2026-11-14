import { validateCreateInvitation } from '../../../../src/validations/invitations/invitations.validation.js';

// Datos extra de la invitación (deseable "Datos extra al invitar"): frecuencia, altura, peso y nacimiento.
const BASE = {
  student_name: 'Pedro Gómez',
  student_email: 'pedro@mail.com',
  delivery_channel: 'qr',
};
const validate = (extra) => validateCreateInvitation({ ...BASE, ...extra });
const fieldsOf = (extra) => {
  try {
    validate(extra);
  } catch (err) {
    return err.details.map((d) => d.field);
  }
  return [];
};

describe('invitations.validation — datos extra', () => {
  it('sin datos extra quedan los cuatro en null', () => {
    expect(validate({})).toMatchObject({
      weekly_frequency: null,
      height_cm: null,
      weight_kg: null,
      birth_date: null,
    });
  });

  it('null explícito cuenta como sin dato', () => {
    const out = validate({ weekly_frequency: null, height_cm: null, weight_kg: null, birth_date: null });
    expect(out).toMatchObject({ weekly_frequency: null, height_cm: null, weight_kg: null, birth_date: null });
  });

  it('conserva los valores válidos (peso y altura con decimales)', () => {
    const out = validate({ weekly_frequency: 4, height_cm: 178.5, weight_kg: 74.5, birth_date: '2002-03-15' });
    expect(out).toMatchObject({ weekly_frequency: 4, height_cm: 178.5, weight_kg: 74.5, birth_date: '2002-03-15' });
  });

  it.each([0, 8, 3.5, '4'])('rechaza weekly_frequency = %p', (value) => {
    expect(fieldsOf({ weekly_frequency: value })).toEqual(['weekly_frequency']);
  });

  it.each([49, 251, '178', Number.NaN])('rechaza height_cm = %p', (value) => {
    expect(fieldsOf({ height_cm: value })).toEqual(['height_cm']);
  });

  it.each([19, 301, '74'])('rechaza weight_kg = %p', (value) => {
    expect(fieldsOf({ weight_kg: value })).toEqual(['weight_kg']);
  });

  it('acepta los bordes de los rangos', () => {
    expect(validate({ weekly_frequency: 1, height_cm: 50, weight_kg: 20 })).toMatchObject({
      weekly_frequency: 1,
      height_cm: 50,
      weight_kg: 20,
    });
    expect(validate({ weekly_frequency: 7, height_cm: 250, weight_kg: 300 }).weekly_frequency).toBe(7);
  });

  it.each(['2002-02-30', '15/03/2002', '1899-12-31', 20020315])('rechaza birth_date = %p', (value) => {
    expect(fieldsOf({ birth_date: value })).toEqual(['birth_date']);
  });

  it('rechaza una fecha de nacimiento futura', () => {
    const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    expect(fieldsOf({ birth_date: tomorrow })).toEqual(['birth_date']);
  });

  it('junta los errores de todos los campos en una sola respuesta', () => {
    expect(fieldsOf({ weekly_frequency: 9, height_cm: 10, weight_kg: 5, birth_date: 'x' })).toEqual([
      'weekly_frequency',
      'height_cm',
      'weight_kg',
      'birth_date',
    ]);
  });
});
