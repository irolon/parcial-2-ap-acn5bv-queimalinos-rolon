import { describe, expect, it } from 'vitest';
import { DEFAULT_FORM, buildGenerateBody, formFromStudent, validateAiForm } from '@/utils/trainer-ai/aiForm';
import { studentDetail } from '../../helpers/students/fixtures';

const valid = { ...DEFAULT_FORM, goal: 'strength', level: 'beginner' };

describe('aiForm', () => {
  it('por defecto: 3 días, 60 minutos y nada más elegido', () => {
    expect(DEFAULT_FORM).toMatchObject({
      studentId: '', goal: '', level: '', frequency: '3', duration: '60', equipment: [], injuries: '', preferences: '', baseTemplateId: '',
    });
  });

  it('precarga objetivo, nivel, equipamiento del catálogo y lesiones del alumno', () => {
    const student = studentDetail({ id: 'st-1', goal: 'strength', level: 'advanced', gym_equipment: ['barbell', 'Rack propio', 'band'], injuries: 'Hombro' });
    expect(formFromStudent(student)).toMatchObject({
      studentId: 'st-1', goal: 'strength', level: 'advanced', equipment: ['barbell', 'band'], injuries: 'Hombro', frequency: '3',
    });
  });

  it('lo que la ficha no tiene queda vacío y se conserva el resto del formulario', () => {
    const base = { ...valid, frequency: '5', preferences: 'Poco tiempo' };
    const form = formFromStudent(studentDetail({ goal: null, level: null, gym_equipment: null, injuries: null }), base);
    expect(form).toMatchObject({ goal: '', level: '', equipment: [], injuries: '', frequency: '5', preferences: 'Poco tiempo' });
  });

  it('valida con las reglas del backend', () => {
    expect(validateAiForm(valid)).toEqual({});
    const bad = { ...DEFAULT_FORM, frequency: '8', duration: '19', injuries: 'x'.repeat(501), preferences: 'y'.repeat(501) };
    expect(validateAiForm(bad)).toEqual({
      goal: 'Elegí un objetivo',
      level: 'Elegí un nivel',
      frequency: 'Entre 1 y 7 días',
      duration: 'Entre 20 y 180 minutos',
      injuries: 'Hasta 500 caracteres',
      preferences: 'Hasta 500 caracteres',
    });
    expect(validateAiForm({ ...valid, frequency: '2.5', duration: '' })).toEqual({ frequency: 'Entre 1 y 7 días', duration: 'Entre 20 y 180 minutos' });
    expect(validateAiForm({ ...valid, frequency: '7', duration: '180', injuries: 'x'.repeat(500) })).toEqual({});
  });

  it('arma el body con números, sin textos vacíos y con el alumno y la plantilla si hay', () => {
    expect(buildGenerateBody(valid)).toEqual({
      goal: 'strength', level: 'beginner', frequency_per_week: 3, session_duration_min: 60, available_equipment: [],
    });
    const full = {
      ...valid, studentId: 'st-1', baseTemplateId: 't-1', frequency: '4', duration: '45', equipment: ['dumbbell'], injuries: ' Rodilla ', preferences: 'Poco tiempo',
    };
    expect(buildGenerateBody(full)).toEqual({
      student_id: 'st-1', base_template_id: 't-1', goal: 'strength', level: 'beginner', frequency_per_week: 4, session_duration_min: 45,
      available_equipment: ['dumbbell'], injuries: 'Rodilla', preferences: 'Poco tiempo',
    });
  });
});
