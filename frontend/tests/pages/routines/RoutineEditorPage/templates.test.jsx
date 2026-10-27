import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { LIBRARY } from '../../../helpers/exercises/fixtures';
import { fillRoutine, renderEditor, rowNames } from '../../../helpers/routines/editor';
import { stubRoutinesApi } from '../../../helpers/routines/routines';
import { TRAINER, renderRoute, setSession } from '../../../helpers/routes/renderRoute';
import { bodyOf, calls, jsonResponse } from '../../../helpers/shared/fetchMock';
import { student } from '../../../helpers/students/fixtures';

const item = (id, order, extra = {}) => ({
  exercise_id: id, sets: 4, reps: 8, rest_seconds: 60, suggested_kg: 20.5, tempo: '3-1-1', notes: 'Bajar lento', order, exercise: { id }, ...extra,
});
const SUMMARY = { id: 't-1', name: 'Full body', goal: 'hypertrophy', level: 'beginner', days: ['monday', 'friday'], exercise_count: 2 };
const DETAIL = {
  ...SUMMARY,
  structure: { version: 1, days: ['monday', 'friday'], exercises: [item('ex-squat', 0), item('ex-plank', 1)] },
};
const api = (extra = {}) => ({ templates: [SUMMARY], template: DETAIL, students: [student({ id: 'st-9', name: 'Ana Paz' })], ...extra });

beforeEach(() => {
  resetAuthStore();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const open = (name) => userEvent.click(screen.getByRole('button', { name }));
const chooseTemplate = () => userEvent.click(screen.getByRole('button', { name: /Full body/ }));
const post = (fetchMock, path) => calls(fetchMock).find(([p, init]) => p === path && init?.method === 'POST');

describe('RoutineEditorPage: usar plantilla', () => {
  it('lista las plantillas y con el editor vacío precarga sin confirmar', async () => {
    await renderEditor({ api: api() });
    await open('Usar plantilla');
    const card = await screen.findByRole('button', { name: /Full body/ });
    expect(within(card).getByText('2 ejercicios')).toBeVisible();
    expect(within(card).getByText('Ganar masa muscular')).toBeVisible();
    expect(within(card).getByText(/Lunes · Viernes/)).toBeVisible();
    await userEvent.click(card);
    await vi.waitFor(() => expect(rowNames()).toEqual(['Sentadilla', 'Plancha']));
    expect(screen.getByLabelText('Nombre de la rutina')).toHaveValue('Full body');
    expect(screen.getByLabelText('Series de Sentadilla')).toHaveValue('4');
    expect(screen.getByText('Desde: Full body')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra el vacío cuando no hay plantillas', async () => {
    await renderEditor({ api: api({ templates: [] }) });
    await open('Usar plantilla');
    expect(await screen.findByText('Todavía no tenés plantillas')).toBeVisible();
  });

  it('con contenido pide confirmación y "Cancelar" deja todo igual', async () => {
    const { fetchMock } = await renderEditor({ api: api() });
    await fillRoutine(['Press banca plano']);
    await open('Usar plantilla');
    await chooseTemplate();
    expect(screen.getByText('Vas a reemplazar lo que armaste')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(rowNames()).toEqual(['Press banca plano']);
    expect(screen.getByLabelText('Nombre de la rutina')).toHaveValue('Fuerza A');
    expect(calls(fetchMock).some(([path]) => path === '/routine-templates/t-1')).toBe(false);
  });

  it('con contenido y confirmando reemplaza todo', async () => {
    await renderEditor({ api: api() });
    await fillRoutine(['Press banca plano']);
    await open('Usar plantilla');
    await chooseTemplate();
    await userEvent.click(screen.getByRole('button', { name: 'Reemplazar' }));
    await vi.waitFor(() => expect(rowNames()).toEqual(['Sentadilla', 'Plancha']));
    expect(screen.getByLabelText('Nombre de la rutina')).toHaveValue('Full body');
  });

  it('avisa los ejercicios que ya no están en la biblioteca', async () => {
    const gone = { ...DETAIL, structure: { ...DETAIL.structure, exercises: [item('ex-squat', 0), item('ex-old', 1, { exercise: null })] } };
    await renderEditor({ api: api({ template: gone }) });
    await open('Usar plantilla');
    await chooseTemplate();
    expect(await screen.findByText('Quitamos 1 ejercicio que ya no está en la biblioteca')).toBeVisible();
    expect(rowNames()).toEqual(['Sentadilla']);
  });

  it('al asignar una rutina que viene de plantilla manda `template_id`', async () => {
    const create = vi.fn(() => jsonResponse(201, { data: { id: 'r-1' } }));
    const { fetchMock } = await renderEditor({ api: api({ handlers: { create } }) });
    await open('Usar plantilla');
    await chooseTemplate();
    await vi.waitFor(() => expect(rowNames()).toHaveLength(2));
    await open('Asignar a alumno');
    await userEvent.selectOptions(await screen.findByLabelText('Alumno'), 'st-9');
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }));
    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    expect(bodyOf(post(fetchMock, '/routines')[1])).toMatchObject({
      template_id: 't-1', name: 'Full body', goal: 'hypertrophy', days: ['monday', 'friday'],
    });
  });
});

describe('RoutineEditorPage: usar plantilla sin biblioteca', () => {
  it('queda deshabilitado hasta que carga la biblioteca', async () => {
    setSession(TRAINER);
    const fetchMock = stubRoutinesApi({ exercises: LIBRARY, ...api() });
    const original = fetchMock.getMockImplementation();
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    fetchMock.mockImplementation(async (url, init) => {
      if (url.includes('/exercises')) await gate;
      return original(url, init);
    });
    renderRoute('/pt/rutinas/nueva');
    const button = await screen.findByRole('button', { name: 'Usar plantilla' });
    expect(button).toBeDisabled();
    release();
    await screen.findByLabelText('Buscar ejercicio');
    await vi.waitFor(() => expect(button).toBeEnabled());
  });

  it('si la biblioteca falla sigue deshabilitado', async () => {
    setSession(TRAINER);
    const fetchMock = stubRoutinesApi({ ...api() });
    const original = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (url, init) => (
      url.includes('/exercises') ? new Response('{}', { status: 500 }) : original(url, init)
    ));
    renderRoute('/pt/rutinas/nueva');
    await screen.findByText(/reintentar/i);
    expect(screen.getByRole('button', { name: 'Usar plantilla' })).toBeDisabled();
  });
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
