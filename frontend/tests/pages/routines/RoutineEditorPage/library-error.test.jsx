import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
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
    expect(screen.getAllByRole('button', { name: 'Reintentar' })).toHaveLength(2);
    expect(screen.queryByText('Recuperamos tu borrador')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usar plantilla' })).toBeDisabled();
  });

  it('al reintentar con éxito el editor queda usable y restaura el borrador', async () => {
    storeDraft();
    renderWithFailingLibrary(1);
    await userEvent.click((await screen.findAllByRole('button', { name: 'Reintentar' }))[0]);
    expect(await screen.findByText('Recuperamos tu borrador')).toBeVisible();
    expect(rowNames()).toEqual(['Sentadilla']);
    expect(screen.getByLabelText('Buscar ejercicio')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Usar plantilla' })).toBeEnabled());
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
  });
});
