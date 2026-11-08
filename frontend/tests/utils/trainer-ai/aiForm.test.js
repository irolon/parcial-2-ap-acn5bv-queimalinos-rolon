import { describe, expect, it } from 'vitest';
import { DEFAULT_FORM, buildGenerateBody, clearPrefill, formFromStudent, studentPrefill, validateAiForm } from '@/utils/trainer-ai/aiForm';
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
      preferences: 'Equipamiento extra del gimnasio: Rack propio',
    });
  });

  it('normaliza el equipamiento en texto libre de la ficha y lo que no mapea va a preferencias', () => {
    const student = studentDetail({ id: 'st-1', gym_equipment: ['barra', 'Mancuernas', 'Banco plano'] });
    expect(studentPrefill(student)).toMatchObject({ equipment: ['barbell', 'dumbbell'], preferences: 'Equipamiento extra del gimnasio: Banco plano' });
    const form = formFromStudent(student, { ...valid, preferences: 'Poco tiempo' });
    expect(form.preferences).toBe('Poco tiempo. Equipamiento extra del gimnasio: Banco plano');
    expect(formFromStudent(student, form).preferences).toBe(form.preferences);
    expect(buildGenerateBody(form)).toMatchObject({ available_equipment: ['barbell', 'dumbbell'], preferences: form.preferences });
  });

  it('al cambiar de alumno saca la nota del anterior de las preferencias y deja lo que escribió el PT', () => {
    const previous = { preferences: 'Equipamiento extra del gimnasio: Banco plano' };
    expect(clearPrefill({ ...valid, preferences: previous.preferences }, previous).preferences).toBe('');
    expect(clearPrefill({ ...valid, preferences: `Poco tiempo. ${previous.preferences}` }, previous).preferences).toBe('Poco tiempo');
  });

  it('no pisa los campos que el PT editó desde que eligió al alumno (`touched`)', () => {
    const student = studentDetail({ id: 'st-1', goal: 'strength', level: 'advanced', gym_equipment: ['barbell'], injuries: 'Hombro' });
    const base = { ...DEFAULT_FORM, injuries: 'Rodilla', level: 'beginner' };
    expect(formFromStudent(student, base, {}, ['injuries'])).toMatchObject({
      studentId: 'st-1', goal: 'strength', level: 'advanced', equipment: ['barbell'], injuries: 'Rodilla',
    });
  });

  it('lo que la ficha no tiene no pisa lo que ya estaba en el formulario', () => {
    const base = { ...valid, equipment: ['dumbbell'], injuries: 'Rodilla', frequency: '5', preferences: 'Poco tiempo' };
    const form = formFromStudent(studentDetail({ id: 'st-2', goal: null, level: null, gym_equipment: null, injuries: null }), base);
    expect(form).toMatchObject({
      studentId: 'st-2', goal: 'strength', level: 'beginner', equipment: ['dumbbell'], injuries: 'Rodilla', frequency: '5', preferences: 'Poco tiempo',
    });
  });

  it('al cambiar de alumno se vacía lo que se había precargado del anterior y el PT no tocó', () => {
    const ana = studentDetail({ id: 'st-1', goal: 'strength', level: 'advanced', gym_equipment: ['barbell'], injuries: 'Hombro' });
    const prefilled = studentPrefill(ana);
    expect(prefilled).toEqual({ goal: 'strength', level: 'advanced', equipment: ['barbell'], injuries: 'Hombro' });
    const touched = { ...formFromStudent(ana), level: 'beginner' };
    const luis = studentDetail({ id: 'st-2', goal: null, level: null, gym_equipment: null, injuries: null });
    expect(formFromStudent(luis, touched, prefilled)).toMatchObject({ studentId: 'st-2', goal: '', level: 'beginner', equipment: [], injuries: '' });
    expect(studentPrefill(luis)).toEqual({});
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

  it('con alumno manda siempre lesiones (null si el PT las borró) y el equipamiento, para que el backend no los complete', () => {
    const body = buildGenerateBody({ ...valid, studentId: 'st-1', injuries: '  ', equipment: [] });
    expect(body).toEqual({
      student_id: 'st-1', goal: 'strength', level: 'beginner', frequency_per_week: 3, session_duration_min: 60, available_equipment: [], injuries: null,
    });
  });
});
