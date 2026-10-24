import { describe, expect, it } from 'vitest';
import {
  buildExerciseBody,
  formDefaults,
  toExerciseErrors,
  validateExerciseBody,
} from '@/utils/exercises/exerciseForm';

const form = (values) => {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
};

const valid = { name: 'Remo', muscle_group: 'back', equipment: null, description: null, video_url: null };

describe('buildExerciseBody', () => {
  it('recorta los textos y manda null en los vacíos', () => {
    const body = buildExerciseBody(
      form({ name: '  Remo  ', muscle_group: 'back', equipment: '', description: '   ', video_url: '' }),
    );
    expect(body).toEqual(valid);
  });

  it('conserva los valores completos', () => {
    const body = buildExerciseBody(
      form({ name: 'Remo', muscle_group: 'back', equipment: 'band', description: 'Tirá', video_url: ' https://youtu.be/x ' }),
    );
    expect(body).toEqual({ ...valid, equipment: 'band', description: 'Tirá', video_url: 'https://youtu.be/x' });
  });
});

describe('validateExerciseBody', () => {
  it('no marca errores en un body válido', () => {
    expect(validateExerciseBody(valid)).toEqual({});
  });

  it('valida el nombre, el grupo muscular, el video y la descripción', () => {
    expect(validateExerciseBody({ ...valid, name: 'A' }).name).toBe(
      'El nombre debe tener entre 2 y 120 caracteres',
    );
    expect(validateExerciseBody({ ...valid, name: 'a'.repeat(121) }).name).toBeDefined();
    expect(validateExerciseBody({ ...valid, muscle_group: '' }).muscle_group).toBe('Elegí un grupo muscular');
    expect(validateExerciseBody({ ...valid, video_url: 'ftp://x.com/v' }).video_url).toBe(
      'El video debe ser un link que empiece con http:// o https:// (máximo 500 caracteres)',
    );
    expect(validateExerciseBody({ ...valid, video_url: `https://x.com/${'a'.repeat(500)}` }).video_url).toBeDefined();
    expect(validateExerciseBody({ ...valid, description: 'a'.repeat(1001) }).description).toBe(
      'La descripción puede tener hasta 1000 caracteres',
    );
  });
});

describe('validateExerciseBody: video sin host', () => {
  it.each(['https://', 'http://'])('rechaza %s como el backend', (url) => {
    expect(validateExerciseBody({ ...valid, video_url: url }).video_url).toBeDefined();
  });
});

describe('formDefaults', () => {
  it('arranca vacío al crear', () => {
    expect(formDefaults()).toEqual({ name: '', muscle_group: '', equipment: '', description: '', video_url: '' });
  });

  it('precarga el ejercicio y descarta un equipamiento desconocido', () => {
    const defaults = formDefaults({ name: 'X', muscle_group: 'back', equipment: 'trx', description: null, video_url: 'https://a.b' });
    expect(defaults).toEqual({ name: 'X', muscle_group: 'back', equipment: '', description: '', video_url: 'https://a.b' });
  });
});

describe('toExerciseErrors', () => {
  it('ubica el detalle en su campo y deja el resto como mensaje general', () => {
    const error = { code: 'VALIDATION_ERROR', details: [{ field: 'video_url', message: 'X' }] };
    expect(toExerciseErrors(error).fields).toEqual({ video_url: 'X' });
    expect(toExerciseErrors({}).form).toBe('No pudimos guardar el ejercicio');
  });
});
