import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { DRAFT_STORAGE_KEY, renderEditor, rowNames } from '../../../helpers/routines/editor';
import { moveExercise } from '@/utils/routines/editorState';
import { buildRoutineBody } from '@/utils/routines/routineForm';

const ROW_HEIGHT = 50;
const realRect = Element.prototype.getBoundingClientRect;

beforeEach(() => {
  resetAuthStore();
  localStorage.clear();
  // jsdom no tiene layout: cada fila ocupa 50px según su posición en el tbody.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
    if (this.tagName !== 'TR' || this.parentElement?.tagName !== 'TBODY') return realRect.call(this);
    const top = Array.from(this.parentElement.children).indexOf(this) * ROW_HEIGHT;
    return { top, bottom: top + ROW_HEIGHT, left: 0, right: 500, width: 500, height: ROW_HEIGHT, x: 0, y: top, toJSON() {} };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function setup(names = ['Sentadilla', 'Plancha', 'Press banca plano']) {
  const utils = await renderEditor();
  for (const name of names) await userEvent.click(screen.getByRole('button', { name: `Agregar ${name}` }));
  return utils;
}

const handle = (name) => screen.getByRole('button', { name: `Mover ${name}` });

describe('RoutineEditorPage: reordenar arrastrando', () => {
  it('cada fila tiene un asa con nombre y descripción de rol en español', async () => {
    await setup();
    expect(handle('Plancha')).toHaveAttribute('aria-roledescription', 'ítem reordenable');
    expect(screen.getByRole('columnheader', { name: 'Arrastrar' })).toBeInTheDocument();
  });

  it('con el teclado levanta, mueve y suelta, y anuncia en español', async () => {
    await setup();
    handle('Plancha').focus();
    await userEvent.keyboard(' ');
    expect(await screen.findByText('Levantaste Plancha. Está en la posición 2 de 3.')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard(' ');
    await waitFor(() => expect(rowNames()).toEqual(['Sentadilla', 'Press banca plano', 'Plancha']));
    expect(await screen.findByText('Soltaste Plancha en la posición 3 de 3.')).toBeInTheDocument();
    expect(handle('Plancha')).toHaveFocus();
  });

  it('Escape cancela y deja el orden como estaba', async () => {
    await setup();
    handle('Plancha').focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Escape}');
    expect(await screen.findByText('Cancelaste. Plancha volvió a la posición 2 de 3.')).toBeInTheDocument();
    expect(rowNames()).toEqual(['Sentadilla', 'Plancha', 'Press banca plano']);
  });

  it('el orden nuevo llega al borrador y al cuerpo que se envía', async () => {
    await setup();
    handle('Plancha').focus();
    await userEvent.keyboard(' {ArrowUp} ');
    await waitFor(() => expect(rowNames()[0]).toBe('Plancha'));
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY));
      expect(saved.exercises.map((e) => e.exercise_id)).toEqual(['ex-plank', 'ex-squat', 'ex-bench']);
    }, { timeout: 3000 });
  });
});

describe('orden de los ejercicios en el cuerpo', () => {
  it('buildRoutineBody numera `order` según el orden tras mover', () => {
    const row = (id) => ({ key: id, exercise_id: id, sets: '3', reps: '10', rest_seconds: '', suggested_kg: '', tempo: '', notes: '' });
    const state = { name: 'Fuerza', goal: 'strength', days: ['monday'], templateId: null, exercises: [row('a'), row('b'), row('c')] };
    const body = buildRoutineBody(moveExercise(state, 0, 2), 'student-1');
    expect(body.exercises.map((e) => [e.exercise_id, e.order])).toEqual([['b', 0], ['c', 1], ['a', 2]]);
  });
});
