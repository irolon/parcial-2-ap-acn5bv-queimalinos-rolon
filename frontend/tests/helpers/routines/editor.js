import { screen } from '@testing-library/react';
import { LIBRARY } from '../exercises/fixtures';
import { TRAINER, renderRoute, setSession } from '../routes/renderRoute';
import { user } from '../shared/user';
import { stubRoutinesApi } from './routines';
import { warmUp } from '../shared/warmUp';

export const DRAFT_STORAGE_KEY = `fittrainer.routine-draft.${TRAINER.id}`;

/** Monta el editor con la biblioteca cargada (espera al buscador de la biblioteca). */
export async function renderEditor({ exercises = LIBRARY, path = '/pt/rutinas/nueva', api = {} } = {}) {
  setSession(TRAINER);
  const fetchMock = stubRoutinesApi({ exercises, ...api });
  const utils = renderRoute(path);
  await screen.findByLabelText('Buscar ejercicio');
  return { ...utils, fetchMock };
}

/** Para `beforeAll`: el primer render del editor en el worker, fuera de los tests (ver `warmUp`). */
export const warmUpEditor = () => warmUp(() => {
  setSession(TRAINER);
  stubRoutinesApi({ exercises: LIBRARY });
  renderRoute('/pt/rutinas/nueva');
}, () => screen.getByLabelText('Buscar ejercicio'));

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
  // Pegado y no tipeado: el nombre no es lo que se prueba, y cada tecla vuelve a dibujar el editor entero.
  await user.click(screen.getByLabelText('Nombre de la rutina'));
  await user.paste('Fuerza A');
  await user.selectOptions(screen.getByLabelText('Objetivo'), 'strength');
  await user.click(screen.getByRole('checkbox', { name: 'Lunes' }));
  for (const name of names) await user.click(screen.getByRole('button', { name: `Agregar ${name}` }));
}
