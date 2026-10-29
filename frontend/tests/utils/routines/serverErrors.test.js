import { describe, expect, it } from 'vitest';
import { serverErrorsFor, templateErrorsFor } from '@/utils/routines/serverErrors';
import { ApiError } from '@/api/shared/client';
import { EX_A, EX_B, stateWith } from '../../helpers/routines/fixtures';

const invalid = (details) => new ApiError({ status: 400, code: 'VALIDATION_ERROR', message: 'Datos inválidos', details });

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

describe('serverErrorsFor: errores de fila sin celda', () => {
  it('`exercise_id` y `order` quedan como mensaje de la fila', () => {
    const state = stateWith([EX_A, EX_B]);
    const errors = serverErrorsFor(invalid([{ field: 'exercises[0].exercise_id', message: 'Ejercicio inexistente' }]), state);
    expect(errors.exercises[state.exercises[0].key]).toEqual({ exercise_id: 'Ejercicio inexistente' });
    expect(errors.form).toBeUndefined();
    expect(errors.count).toBe(1);
    const order = serverErrorsFor(invalid([{ field: 'exercises[1].order', message: 'Orden repetido' }]), state);
    expect(order.exercises[state.exercises[1].key]).toEqual({ order: 'Orden repetido' });
  });
});

describe('serverErrorsFor: varios errores en la misma fila', () => {
  it('`exercise_id` y `order` no se pisan y cuentan por separado', () => {
    const state = stateWith([EX_A]);
    const errors = serverErrorsFor(invalid([
      { field: 'exercises[0].exercise_id', message: 'Ejercicio inexistente' },
      { field: 'exercises[0].order', message: 'Orden repetido' },
    ]), state);
    expect(errors.exercises[state.exercises[0].key]).toEqual({ exercise_id: 'Ejercicio inexistente', order: 'Orden repetido' });
    expect(errors.count).toBe(2);
  });
});

describe('templateErrorsFor', () => {
  it('mapea `structure.*` a filas y días, y nombre/objetivo al modal', () => {
    const state = stateWith([EX_A, EX_B]);
    const errors = templateErrorsFor(invalid([
      { field: 'structure.exercises[1].reps', message: 'Reps fuera de rango' },
      { field: 'structure.days', message: 'Elegí días válidos' },
      { field: 'name', message: 'Nombre repetido' },
      { field: 'goal', message: 'Objetivo inválido' },
    ]), state);
    expect(errors.exercises[state.exercises[1].key]).toEqual({ reps: 'Reps fuera de rango' });
    expect(errors.header).toEqual({ days: 'Elegí días válidos' });
    expect(errors.dialog).toEqual({ name: 'Nombre repetido', goal: 'Objetivo inválido' });
    expect(errors.count).toBe(2);
  });

  it('un error de otro tipo va a form', () => {
    const errors = templateErrorsFor(new ApiError({ status: 500, code: 'INTERNAL', message: 'Falló' }), stateWith());
    expect(errors.form).toBe('Falló');
    expect(errors.dialog).toEqual({});
  });
});
