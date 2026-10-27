import { screen } from '@testing-library/react';
import { LIBRARY } from '../exercises/fixtures';
import { TRAINER, renderRoute, setSession } from '../routes/renderRoute';
import userEvent from '@testing-library/user-event';
import { stubRoutinesApi } from './routines';

export const DRAFT_STORAGE_KEY = `fittrainer.routine-draft.${TRAINER.id}`;

/** Monta el editor con la biblioteca cargada (espera al buscador de la biblioteca). */
export async function renderEditor({ exercises = LIBRARY, path = '/pt/rutinas/nueva', api = {} } = {}) {
  setSession(TRAINER);
  const fetchMock = stubRoutinesApi({ exercises, ...api });
  const utils = renderRoute(path);
  await screen.findByLabelText('Buscar ejercicio');
  return { ...utils, fetchMock };
}

/** Deja un borrador guardado como lo escribe el editor. */
export function storeDraft(overrides = {}) {
  const base = {
    name: 'Fuerza A',
    goal: 'strength',
    days: ['monday'],
    templateId: null,
    templateName: null,
    exercises: [{ exercise_id: 'ex-squat', sets: '4', reps: '8', rest_seconds: '60', suggested_kg: '', tempo: '', notes: '' }],
  };
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...base, ...overrides }));
}

/** Nombres de los ejercicios de la tabla, en orden. */
export function rowNames() {
  return screen.getAllByLabelText(/^Series de /).map((el) => el.getAttribute('aria-label').replace('Series de ', ''));
}

/** Arma una rutina válida: nombre, objetivo, un día y los ejercicios pedidos (en ese orden). */
export async function fillRoutine(names = ['Sentadilla', 'Plancha', 'Press banca plano']) {
  await userEvent.type(screen.getByLabelText('Nombre de la rutina'), 'Fuerza A');
  await userEvent.selectOptions(screen.getByLabelText('Objetivo'), 'strength');
  await userEvent.click(screen.getByRole('checkbox', { name: 'Lunes' }));
  for (const name of names) await userEvent.click(screen.getByRole('button', { name: `Agregar ${name}` }));
}
