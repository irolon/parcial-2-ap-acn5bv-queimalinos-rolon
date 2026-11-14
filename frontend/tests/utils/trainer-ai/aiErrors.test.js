import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/shared/client';
import { aiErrorOf } from '@/utils/trainer-ai/aiErrors';

const err = (status, code, message = code, extra = {}) => new ApiError({ status, code, message, ...extra });

describe('aiErrorOf', () => {
  it('503, sin red o cualquier otro: el asistente no está disponible', () => {
    for (const e of [err(503, 'AI_UNAVAILABLE'), err(0, 'NETWORK_ERROR'), err(500, 'INTERNAL_ERROR'), new Error('x')]) {
      expect(aiErrorOf(e)).toEqual({ kind: 'unavailable', message: 'El asistente no está disponible ahora.' });
    }
  });

  it('502: la propuesta no sirve', () => {
    expect(aiErrorOf(err(502, 'AI_INVALID_RESPONSE'))).toEqual({
      kind: 'invalid', message: 'La IA devolvió una propuesta que no sirve. Probá de nuevo.',
    });
  });

  it('429: el mensaje del backend y los segundos de Retry-After (38, el timeout del backend, si no vinieron)', () => {
    const busy = err(429, 'RATE_LIMIT_EXCEEDED', 'Ya hay una propuesta en curso', { retryAfter: 30 });
    expect(aiErrorOf(busy)).toEqual({ kind: 'rate', message: 'Ya hay una propuesta en curso', retryAfter: 30 });
    expect(aiErrorOf(err(429, 'RATE_LIMIT_EXCEEDED', 'Límite'))).toMatchObject({ retryAfter: 38 });
  });

  it('404 del alumno o de la plantilla: en su campo', () => {
    expect(aiErrorOf(err(404, 'STUDENT_NOT_FOUND'))).toEqual({ kind: 'fields', fields: { studentId: 'Ese alumno no está activo o no existe' } });
    expect(aiErrorOf(err(404, 'TEMPLATE_NOT_FOUND'))).toEqual({ kind: 'fields', fields: { baseTemplateId: 'Esa plantilla ya no existe' } });
  });

  it('400: cada detalle en su campo, con el texto del formulario', () => {
    const details = [
      { field: 'frequency_per_week', message: 'frequency_per_week debe ser…' },
      { field: 'injuries', message: '…' },
      { field: 'otro', message: '…' },
    ];
    expect(aiErrorOf(err(400, 'VALIDATION_ERROR', 'Error de validación', { details }))).toEqual({
      kind: 'fields', fields: { frequency: 'Entre 1 y 7 días', injuries: 'Hasta 500 caracteres' },
    });
    expect(aiErrorOf(err(400, 'VALIDATION_ERROR', 'Error de validación', { details: [] }))).toEqual({
      kind: 'fields', fields: {}, form: 'Revisá los datos del formulario',
    });
  });
});
