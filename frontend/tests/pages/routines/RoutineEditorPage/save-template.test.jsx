import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { fillRoutine, renderEditor } from '../../../helpers/routines/editor';
import { api, open, post } from '../../../helpers/routines/templates';
import { bodyOf, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';

beforeEach(() => {
  resetAuthStore();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('RoutineEditorPage: guardar como plantilla', () => {
  it('propone nombre y objetivo de la rutina y manda la estructura', async () => {
    const createTemplate = vi.fn(() => jsonResponse(201, { data: { id: 't-2' } }));
    const { fetchMock } = await renderEditor({ api: api({ handlers: { createTemplate } }) });
    await fillRoutine(['Sentadilla', 'Plancha']);
    await open('Guardar como plantilla');
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByLabelText('Nombre')).toHaveValue('Fuerza A');
    expect(dialog.getByLabelText('Objetivo')).toHaveValue('strength');
    await userEvent.selectOptions(dialog.getByLabelText('Nivel (opcional)'), 'advanced');
    await userEvent.click(dialog.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Plantilla guardada')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const exercise = (id, order) => ({ exercise_id: id, sets: 3, reps: 10, rest_seconds: 90, suggested_kg: null, tempo: null, notes: null, order });
    expect(bodyOf(post(fetchMock, '/routine-templates')[1])).toEqual({
      name: 'Fuerza A',
      goal: 'strength',
      level: 'advanced',
      structure: { version: 1, days: ['monday'], exercises: [exercise('ex-squat', 0), exercise('ex-plank', 1)] },
    });
  });

  it('sin ejercicios no guarda y lo pide', async () => {
    const { fetchMock } = await renderEditor({ api: api() });
    await fillRoutine([]);
    await open('Guardar como plantilla');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByText('Agregá al menos un ejercicio')).toBeVisible();
    expect(post(fetchMock, '/routine-templates')).toBeUndefined();
  });
});

describe('RoutineEditorPage: guardar como plantilla con valores inválidos', () => {
  it('revisa las filas, no manda nada y marca la celda', async () => {
    const { fetchMock } = await renderEditor({ api: api() });
    await fillRoutine(['Sentadilla', 'Plancha']);
    await userEvent.clear(screen.getByLabelText('Reps de Sentadilla'));
    await open('Guardar como plantilla');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }));
    expect(screen.getByText('Revisá los valores de los ejercicios en la tabla')).toBeVisible();
    expect(post(fetchMock, '/routine-templates')).toBeUndefined();
    expect(screen.getByLabelText('Reps de Sentadilla')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('RoutineEditorPage: guardar como plantilla con errores del servidor', () => {
  it('un 400 marca la tabla, los días y el modal', async () => {
    const details = [
      { field: 'structure.exercises[1].reps', message: 'Reps fuera de rango' },
      { field: 'name', message: 'Ya tenés una plantilla con ese nombre' },
    ];
    const createTemplate = vi.fn(() => errorResponse(400, 'VALIDATION_ERROR', 'Datos inválidos', details));
    await renderEditor({ api: api({ handlers: { createTemplate } }) });
    await fillRoutine(['Sentadilla', 'Plancha']);
    await open('Guardar como plantilla');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(await dialog.findByText('Revisá los datos de la rutina')).toBeVisible();
    expect(dialog.getByText('Ya tenés una plantilla con ese nombre')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByLabelText('Reps de Plancha')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Reps fuera de rango')).toBeVisible();
    expect(screen.getByText('Revisá 1 campo')).toBeVisible();
  });
});
