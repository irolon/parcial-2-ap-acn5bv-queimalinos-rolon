import { describe, it, expect } from '@jest/globals';
import { validateUpdateMe } from '../../../../src/validations/auth/profile.validation.js';

/** Detalles del VALIDATION_ERROR que tira el body dado. */
function detailsOf(body) {
  try {
    validateUpdateMe(body);
  } catch (err) {
    expect(err).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    return err.details;
  }
  throw new Error('No tiró VALIDATION_ERROR');
}

const TITLE_MSG = 'professional_title debe tener entre 2 y 80 caracteres';

describe('validateUpdateMe (GX2)', () => {
  it('recorta el título y el nombre', () => {
    expect(validateUpdateMe({ name: ' Laura Gómez ', professional_title: '  Lic. en Ed. Física  ' })).toEqual({
      name: 'Laura Gómez',
      professional_title: 'Lic. en Ed. Física',
    });
  });

  it('título vacío o null → null (borrar)', () => {
    expect(validateUpdateMe({ professional_title: '' })).toEqual({ professional_title: null });
    expect(validateUpdateMe({ professional_title: '   ' })).toEqual({ professional_title: null });
    expect(validateUpdateMe({ professional_title: null })).toEqual({ professional_title: null });
  });

  it('título de 1 o de 81 caracteres → detalle en professional_title', () => {
    expect(detailsOf({ professional_title: 'A' })).toEqual([{ field: 'professional_title', message: TITLE_MSG }]);
    expect(detailsOf({ professional_title: 'x'.repeat(81) })).toEqual([
      { field: 'professional_title', message: TITLE_MSG },
    ]);
  });

  it('título que no es texto → detalle', () => {
    expect(detailsOf({ professional_title: 42 })[0].field).toBe('professional_title');
  });

  it('nombre fuera de 2–100 → detalle en name', () => {
    expect(detailsOf({ name: 'A' })).toEqual([{ field: 'name', message: 'name debe tener entre 2 y 100 caracteres' }]);
    expect(detailsOf({ name: null })[0].field).toBe('name');
  });

  it('body vacío → 400 en body', () => {
    expect(detailsOf({})[0].field).toBe('body');
  });

  it('otros campos se ignoran: { email } solo → 400', () => {
    expect(detailsOf({ email: 'x' })[0].field).toBe('body');
    expect(validateUpdateMe({ name: 'Laura', email: 'x', specialty: 'y' })).toEqual({ name: 'Laura' });
  });
});
