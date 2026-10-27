import { screen } from '@testing-library/react';
import { LIBRARY } from '../exercises/fixtures';
import { TRAINER, renderRoute, setSession } from '../routes/renderRoute';
import { stubRoutinesApi } from './routines';

export const DRAFT_STORAGE_KEY = `fittrainer.routine-draft.${TRAINER.id}`;

/** Monta el editor con la biblioteca cargada (espera al buscador de la biblioteca). */
export async function renderEditor({ exercises = LIBRARY } = {}) {
  setSession(TRAINER);
  const fetchMock = stubRoutinesApi({ exercises });
  const utils = renderRoute('/pt/rutinas/nueva');
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
