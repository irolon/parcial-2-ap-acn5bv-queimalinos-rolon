import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { EXERCISES_KEY } from '@/hooks/exercises/useExercises';
import { LIBRARY } from '../../../helpers/exercises/fixtures';
import { DRAFT_STORAGE_KEY, rowNames, storeDraft } from '../../../helpers/routines/editor';
import { stubRoutinesApi } from '../../../helpers/routines/routines';
import { TRAINER, renderRoute, setSession } from '../../../helpers/routes/renderRoute';

beforeEach(() => {
  resetAuthStore();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Monta el editor con `GET /exercises` fallando las primeras `times` veces. */
function renderWithFailingLibrary(times) {
  setSession(TRAINER);
  const fetchMock = stubRoutinesApi({ exercises: LIBRARY });
  const original = fetchMock.getMockImplementation();
  let left = times;
  fetchMock.mockImplementation(async (url, init) => (
    url.includes('/exercises') && left-- > 0 ? new Response('{}', { status: 500 }) : original(url, init)
  ));
  return renderRoute('/pt/rutinas/nueva');
}

describe('RoutineEditorPage: biblioteca caída', () => {
  it('avisa en la página y en el panel, con "Reintentar", y no restaura el borrador', async () => {
    storeDraft();
    renderWithFailingLibrary(1);
    expect(await screen.findByText('No pudimos cargar la biblioteca de ejercicios. Reintentá para seguir armando la rutina.')).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Reintentar' })).toHaveLength(1);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText('No pudimos cargar los ejercicios.')).toBeVisible();
    expect(screen.queryByText('Recuperamos tu borrador')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usar plantilla' })).toBeDisabled();
  });

  it('al reintentar con éxito el editor queda usable y restaura el borrador', async () => {
    storeDraft();
    renderWithFailingLibrary(1);
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Recuperamos tu borrador')).toBeVisible();
    expect(rowNames()).toEqual(['Sentadilla']);
    expect(screen.getByLabelText('Buscar ejercicio')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Usar plantilla' })).toBeEnabled());
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
  });
});

describe('RoutineEditorPage: biblioteca ya cargada', () => {
  it('si falla un refetch en segundo plano, el panel sigue y no hay aviso', async () => {
    setSession(TRAINER);
    const fetchMock = stubRoutinesApi({ exercises: LIBRARY });
    const original = fetchMock.getMockImplementation();
    let broken = false;
    fetchMock.mockImplementation(async (url, init) => (
      url.includes('/exercises') && broken ? new Response('{}', { status: 500 }) : original(url, init)
    ));
    const { queryClient } = renderRoute('/pt/rutinas/nueva');
    await screen.findByLabelText('Buscar ejercicio');
    broken = true;
    await queryClient.refetchQueries({ queryKey: EXERCISES_KEY });
    await waitFor(() => expect(queryClient.getQueryState(EXERCISES_KEY).fetchStatus).toBe('idle'));
    expect(queryClient.getQueryState(EXERCISES_KEY).status).toBe('error');
    expect(screen.getByLabelText('Buscar ejercicio')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Agregar Sentadilla' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
