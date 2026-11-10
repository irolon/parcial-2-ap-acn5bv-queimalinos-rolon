import { describe, it, expect } from '@jest/globals';
import {
  validateGenerateRoutine,
  validateSaveAsTemplate,
} from '../../../../src/validations/trainer-ai/trainer-ai.validation.js';

const UUID = '11111111-1111-4111-8111-111111111111';
const BASE = { goal: 'hypertrophy', level: 'beginner', frequency_per_week: 3 };

/** Campos con error de una validación que tiene que fallar. */
function failedFields(fn, body) {
  try {
    fn(body);
  } catch (err) {
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    return err.details.map((d) => d.field);
  }
  throw new Error('esperaba un 400');
}

describe('trainer-ai.validation · validateGenerateRoutine', () => {
  it('devuelve el body saneado con session_duration_min = 60 por defecto', () => {
    expect(validateGenerateRoutine({ ...BASE, extra: 'x' })).toEqual({ ...BASE, session_duration_min: 60 });
  });

  it('acepta todos los campos opcionales y recorta los textos', () => {
    const out = validateGenerateRoutine({
      ...BASE,
      student_id: UUID,
      base_template_id: UUID,
      session_duration_min: 90,
      available_equipment: ['dumbbell', 'band'],
      injuries: '  rodilla  ',
      preferences: 'nada de burpees',
    });
    expect(out).toEqual({
      ...BASE,
      student_id: UUID,
      base_template_id: UUID,
      session_duration_min: 90,
      available_equipment: ['dumbbell', 'band'],
      injuries: 'rodilla',
      preferences: 'nada de burpees',
    });
  });

  it.each([
    ['goal', { goal: 'bulk' }],
    ['level', { level: 'pro' }],
    ['frequency_per_week', { frequency_per_week: 0 }],
    ['frequency_per_week', { frequency_per_week: 8 }],
    ['frequency_per_week', { frequency_per_week: 2.5 }],
    ['frequency_per_week', { frequency_per_week: '3' }],
    ['session_duration_min', { session_duration_min: 19 }],
    ['session_duration_min', { session_duration_min: 181 }],
    ['session_duration_min', { session_duration_min: 45.5 }],
    ['available_equipment', { available_equipment: ['rope'] }],
    ['available_equipment', { available_equipment: ['band', 'band'] }],
    ['available_equipment', { available_equipment: 'band' }],
    ['injuries', { injuries: 'x'.repeat(501) }],
    ['injuries', { injuries: 3 }],
    ['preferences', { preferences: 'x'.repeat(501) }],
    ['student_id', { student_id: 'abc' }],
    ['base_template_id', { base_template_id: 'abc' }],
  ])('rechaza %s inválido (%j)', (field, patch) => {
    expect(failedFields(validateGenerateRoutine, { ...BASE, ...patch })).toContain(field);
  });

  it('frequency_per_week es obligatorio aunque venga student_id', () => {
    expect(failedFields(validateGenerateRoutine, { student_id: UUID })).toEqual(['frequency_per_week']);
  });

  it('sin student_id, goal y level son obligatorios', () => {
    expect(failedFields(validateGenerateRoutine, { frequency_per_week: 3 })).toEqual(['goal', 'level']);
  });

  it('con student_id, goal y level pueden faltar (los completa el alumno)', () => {
    expect(validateGenerateRoutine({ student_id: UUID, frequency_per_week: 2 })).toEqual({
      student_id: UUID,
      frequency_per_week: 2,
      session_duration_min: 60,
    });
  });

  it('acepta available_equipment vacío (queda solo bodyweight al resolver)', () => {
    expect(validateGenerateRoutine({ ...BASE, available_equipment: [] }).available_equipment).toEqual([]);
  });

  it('preferences vacío o null queda como no enviado', () => {
    expect(validateGenerateRoutine({ ...BASE, preferences: null })).not.toHaveProperty('preferences');
    expect(validateGenerateRoutine({ ...BASE, preferences: '  ' })).not.toHaveProperty('preferences');
  });

  it('injuries vacío o null explícito es "sin lesiones" (null); ausente no viaja', () => {
    expect(validateGenerateRoutine({ ...BASE, injuries: '   ' }).injuries).toBeNull();
    expect(validateGenerateRoutine({ ...BASE, injuries: null }).injuries).toBeNull();
    expect(validateGenerateRoutine(BASE)).not.toHaveProperty('injuries');
  });

  it('available_equipment null explícito es lista vacía; ausente no viaja', () => {
    expect(validateGenerateRoutine({ ...BASE, available_equipment: null }).available_equipment).toEqual([]);
    expect(validateGenerateRoutine(BASE)).not.toHaveProperty('available_equipment');
  });
});

describe('trainer-ai.validation · validateSaveAsTemplate', () => {
  it('devuelve generation_id y template_name recortado', () => {
    expect(validateSaveAsTemplate({ generation_id: UUID, template_name: '  Fuerza  ', x: 1 })).toEqual({
      generation_id: UUID,
      template_name: 'Fuerza',
    });
  });

  it.each([
    ['generation_id', { generation_id: 'abc', template_name: 'F' }],
    ['template_name', { generation_id: UUID, template_name: '' }],
    ['template_name', { generation_id: UUID, template_name: '   ' }],
    ['template_name', { generation_id: UUID, template_name: 'x'.repeat(121) }],
    ['template_name', { generation_id: UUID }],
  ])('rechaza %s inválido (%j)', (field, body) => {
    expect(failedFields(validateSaveAsTemplate, body)).toContain(field);
  });
});
