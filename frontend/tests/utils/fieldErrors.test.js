import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/shared/client';
import { NO_FIELD_ERRORS, fieldErrorsFrom } from '@/utils/fieldErrors';

const OPTIONS = {
  fields: ['email', 'password'],
  fieldCodes: { EMAIL_TAKEN: { field: 'email', message: 'Email ocupado' } },
  messages: { BAD: 'Algo salió mal' },
  fallback: 'Error genérico',
};

const apiError = (code, message = code, details = null) =>
  new ApiError({ status: 400, code, message, details });

describe('fieldErrorsFrom', () => {
  it('el estado inicial no tiene errores', () => {
    expect(NO_FIELD_ERRORS).toEqual({ form: null, fields: {} });
  });

  it('un código de campo va a ese campo', () => {
    expect(fieldErrorsFrom(apiError('EMAIL_TAKEN'), OPTIONS)).toEqual({
      form: null,
      fields: { email: 'Email ocupado' },
    });
  });

  it('VALIDATION_ERROR reparte los detalles conocidos y se queda con el primero de cada campo', () => {
    const error = apiError('VALIDATION_ERROR', 'Error de validación', [
      { field: 'email', message: 'Email inválido' },
      { field: 'email', message: 'Otro' },
      { field: 'otro', message: 'Ignorado' },
      { field: 'password', message: 'Muy corta' },
    ]);
    expect(fieldErrorsFrom(error, OPTIONS)).toEqual({
      form: null,
      fields: { email: 'Email inválido', password: 'Muy corta' },
    });
  });

  it('VALIDATION_ERROR sin campos conocidos cae al mensaje del backend', () => {
    const error = apiError('VALIDATION_ERROR', 'Error de validación', [{ field: 'x', message: 'y' }]);
    expect(fieldErrorsFrom(error, OPTIONS)).toEqual({ form: 'Error de validación', fields: {} });
  });

  it('usa el mensaje propio, el de red, el del backend o el fallback', () => {
    expect(fieldErrorsFrom(apiError('BAD', 'backend'), OPTIONS).form).toBe('Algo salió mal');
    expect(fieldErrorsFrom(apiError('NETWORK_ERROR', 'x'), OPTIONS).form).toBe(
      'No hay conexión con el servidor',
    );
    expect(fieldErrorsFrom(apiError('OTRO', 'Mensaje del backend'), OPTIONS).form).toBe(
      'Mensaje del backend',
    );
    expect(fieldErrorsFrom(undefined, OPTIONS).form).toBe('Error genérico');
  });
});
