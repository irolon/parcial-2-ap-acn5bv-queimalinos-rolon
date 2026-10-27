import { describe, expect, it } from 'vitest';
import { EMPTY_ROUTINE, updateExercise, updateHeader } from '@/utils/routines/editorState';
import { buildRoutineBody, buildTemplateBody, serverErrorsFor, validateRoutine } from '@/utils/routines/routineForm';
import { ApiError } from '@/api/shared/client';
import { EX_A, EX_B, stateWith } from '../../helpers/routines/fixtures';

describe('validateRoutine', () => {
  it('una rutina válida no tiene errores', () => {
    expect(validateRoutine(stateWith())).toEqual({ header: {}, exercises: {}, count: 0 });
  });

  it('valida cabecera y que haya ejercicios', () => {
    const errors = validateRoutine({ ...EMPTY_ROUTINE, name: 'a' });
    expect(errors.header).toEqual({
      name: 'El nombre debe tener entre 2 y 120 caracteres',
      goal: 'Elegí un objetivo',
      days: 'Elegí al menos un día',
    });
    expect(errors.form).toBe('Agregá al menos un ejercicio');
    expect(errors.count).toBe(4);
    expect(validateRoutine(updateHeader(stateWith(), 'name', 'x'.repeat(121))).header.name).toBeDefined();
  });

  it('rechaza Infinity y hexadecimales en los opcionales', () => {
    let state = stateWith([EX_A]);
    const key = state.exercises[0].key;
    state = updateExercise(state, key, 'suggested_kg', 'Infinity');
    state = updateExercise(state, key, 'rest_seconds', '0x10');
    expect(Object.keys(validateRoutine(state).exercises[key])).toEqual(['rest_seconds', 'suggested_kg']);
  });

  it('valida cada campo del ejercicio', () => {
    let state = stateWith([EX_A, EX_B]);
    const [a, b] = state.exercises.map((e) => e.key);
    state = updateExercise(state, a, 'sets', '0');
    state = updateExercise(state, a, 'reps', '2.5');
    state = updateExercise(state, a, 'rest_seconds', '-1');
    state = updateExercise(state, a, 'suggested_kg', '-3');
    state = updateExercise(state, a, 'tempo', 'x'.repeat(21));
    state = updateExercise(state, b, 'notes', 'x'.repeat(501));
    const { exercises, count } = validateRoutine(state);
    expect(exercises[a]).toEqual({
      sets: 'Tiene que ser un entero mayor que 0',
      reps: 'Tiene que ser un entero mayor que 0',
      rest_seconds: 'No puede ser negativo',
      suggested_kg: 'No puede ser negativo',
      tempo: 'Hasta 20 caracteres',
    });
    expect(exercises[b]).toEqual({ notes: 'Hasta 500 caracteres' });
    expect(count).toBe(6);
  });
});

describe('decimales', () => {
  it('acepta .5 y la coma rioplatense y manda números', () => {
    let state = stateWith([EX_A]);
    const key = state.exercises[0].key;
    state = updateExercise(state, key, 'suggested_kg', '27,5');
    expect(validateRoutine(state).count).toBe(0);
    expect(buildRoutineBody(state, 's-1').exercises[0].suggested_kg).toBe(27.5);
    state = updateExercise(state, key, 'suggested_kg', '.5');
    expect(validateRoutine(state).count).toBe(0);
    expect(buildRoutineBody(state, 's-1').exercises[0].suggested_kg).toBe(0.5);
  });

  it('series, reps y descanso siguen siendo enteros', () => {
    let state = stateWith([EX_A]);
    const key = state.exercises[0].key;
    for (const field of ['sets', 'reps']) state = updateExercise(state, key, field, '2,5');
    state = updateExercise(state, key, 'rest_seconds', '.5');
    expect(Object.keys(validateRoutine(state).exercises[key])).toEqual(['sets', 'reps', 'rest_seconds']);
  });
});

describe('buildRoutineBody', () => {
  it('convierte números, vacíos a null y order por índice', () => {
    let state = stateWith([EX_A, EX_B], { name: '  Fuerza  ', templateId: 't-1' });
    state = updateExercise(state, state.exercises[0].key, 'suggested_kg', '22.5');
    state = updateExercise(state, state.exercises[1].key, 'rest_seconds', '');
    const body = buildRoutineBody(state, 's-1');
    expect(body).toMatchObject({ student_id: 's-1', name: 'Fuerza', goal: 'strength', days: ['monday'], template_id: 't-1' });
    expect(body.exercises[0]).toEqual({
      exercise_id: EX_A, sets: 3, reps: 10, rest_seconds: 90, suggested_kg: 22.5, tempo: null, notes: null, order: 0,
    });
    expect(body.exercises[1]).toMatchObject({ rest_seconds: null, order: 1 });
  });

  it('omite template_id si no hay plantilla', () => {
    expect(buildRoutineBody(stateWith(), 's-1')).not.toHaveProperty('template_id');
  });
});

describe('buildTemplateBody', () => {
  it('arma la estructura sin template_id', () => {
    const state = stateWith([EX_A], { templateId: 't-1' });
    const body = buildTemplateBody(state, { name: 'Mi plantilla', goal: 'strength', level: '' });
    expect(body).toMatchObject({ name: 'Mi plantilla', goal: 'strength', level: null });
    expect(body.structure).toMatchObject({ version: 1, days: ['monday'] });
    expect(body.structure.exercises).toEqual([expect.objectContaining({ exercise_id: EX_A, order: 0 })]);
    expect(JSON.stringify(body)).not.toContain('template_id');
  });
});

describe('serverErrorsFor', () => {
  it('mapea detalles a la fila y a la cabecera', () => {
    const state = stateWith([EX_A, EX_B]);
    const error = new ApiError({
      status: 400, code: 'VALIDATION_ERROR', message: 'Datos inválidos',
      details: [
        { field: 'exercises[1].reps', message: 'Debe ser positivo' },
        { field: 'name', message: 'Nombre inválido' },
      ],
    });
    const errors = serverErrorsFor(error, state);
    expect(errors.exercises[state.exercises[1].key]).toEqual({ reps: 'Debe ser positivo' });
    expect(errors.header).toEqual({ name: 'Nombre inválido' });
    expect(errors.count).toBe(2);
  });

  it('los detalles sin campo conocido van a form', () => {
    const error = new ApiError({
      status: 400, code: 'VALIDATION_ERROR', message: 'Datos inválidos',
      details: [{ field: 'student_id', message: 'Alumno inválido' }, { field: 'exercises[9].sets', message: 'Fuera de rango' }],
    });
    expect(serverErrorsFor(error, stateWith()).form).toBe('Alumno inválido. Fuera de rango');
  });

  it('el resto de los errores va a form', () => {
    const errors = serverErrorsFor(new ApiError({ status: 500, code: 'INTERNAL', message: 'Falló' }), stateWith());
    expect(errors.form).toBe('Falló');
    expect(errors.header).toEqual({});
  });
});
