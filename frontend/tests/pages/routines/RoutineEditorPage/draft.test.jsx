import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { DRAFT_STORAGE_KEY, renderEditor, rowNames, storeDraft } from '../../../helpers/routines/editor';

beforeEach(() => {
  resetAuthStore();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const stored = () => JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY));

describe('RoutineEditorPage: borrador', () => {
  it('guarda un segundo después de un cambio y lo muestra en la topbar', async () => {
    await renderEditor();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Sentadilla' }));
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(stored().exercises).toEqual([
      { exercise_id: 'ex-squat', sets: '3', reps: '10', rest_seconds: '90', suggested_kg: '', tempo: '', notes: '' },
    ]);
    expect(screen.getByText(/AUTO-GUARDADO · HACE 0S/)).toBeVisible();
  });

  it('al volver restaura el borrador con el aviso', async () => {
    storeDraft();
    await renderEditor();
    expect(await screen.findByText('Recuperamos tu borrador')).toBeVisible();
    expect(screen.getByLabelText('Nombre de la rutina')).toHaveValue('Fuerza A');
    expect(screen.getByLabelText('Objetivo')).toHaveValue('strength');
    expect(screen.getByRole('checkbox', { name: 'Lunes' })).toBeChecked();
    expect(rowNames()).toEqual(['Sentadilla']);
    expect(screen.getByLabelText('Series de Sentadilla')).toHaveValue('4');
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
  });

  it('un borrador vacío no muestra el aviso', async () => {
    storeDraft({ name: '', goal: '', days: [], exercises: [] });
    await renderEditor();
    expect(screen.queryByText('Recuperamos tu borrador')).not.toBeInTheDocument();
  });

  it('"Descartar" pide confirmación y limpia el borrador', async () => {
    storeDraft();
    await renderEditor();
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Recuperamos tu borrador')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, descartar' }));
    expect(screen.queryByText('Recuperamos tu borrador')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de la rutina')).toHaveValue('');
    expect(screen.getByText('Agregá ejercicios desde la biblioteca')).toBeVisible();
    await vi.waitFor(() => expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull());
  });

  it('quita del borrador un ejercicio que ya no existe y avisa', async () => {
    const gone = { exercise_id: 'ex-borrado', sets: '3', reps: '10', rest_seconds: '90', suggested_kg: '', tempo: '', notes: '' };
    storeDraft({ exercises: [gone, { ...gone, exercise_id: 'ex-plank' }] });
    await renderEditor();
    expect(await screen.findByText(/Quitamos 1 ejercicio que ya no existe/)).toBeVisible();
    expect(rowNames()).toEqual(['Plancha']);
  });

  it('si localStorage falla, el editor sigue funcionando', async () => {
    const blocked = () => { throw new Error('bloqueado'); };
    const { getItem, setItem } = Storage.prototype;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function read(key) { return key.includes('routine-draft') ? blocked() : getItem.call(this, key); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function write(key, value) { return key.includes('routine-draft') ? blocked() : setItem.call(this, key, value); });
    await renderEditor();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Plancha' }));
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(rowNames()).toEqual(['Plancha']);
  });
});
