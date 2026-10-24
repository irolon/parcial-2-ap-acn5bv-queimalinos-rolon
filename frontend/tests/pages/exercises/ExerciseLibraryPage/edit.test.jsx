import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { LIBRARY } from '../../../helpers/exercises/fixtures';
import { PAGE_PATH, page, stubLibrary } from '../../../helpers/exercises/library';
import { TRAINER, renderRoute, setSession } from '../../../helpers/routes/renderRoute';
import { bodyOf, calls, jsonResponse } from '../../../helpers/shared/fetchMock';

const field = (label) => within(screen.getByRole('dialog')).getByLabelText(label);

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const INCLINE = { ...LIBRARY.find((e) => e.id === 'ex-incline'), video_url: 'https://youtu.be/abc123def45' };

describe('ExerciseLibraryPage: editar ejercicio', () => {
  it('precarga el ejercicio y al borrar el link manda PATCH con video_url null', async () => {
    const list = LIBRARY.map((e) => (e.id === INCLINE.id ? INCLINE : e));
    const fetchMock = stubLibrary({
      list,
      handlers: { update: () => jsonResponse(200, { data: { ...INCLINE, video_url: null } }) },
    });
    renderRoute(PAGE_PATH);
    await screen.findByText(/^\d+ EJERCICIOS$/);
    const user = userEvent.setup();
    await user.click(page().getByRole('button', { name: 'Editar Press inclinado con mancuernas' }));

    expect(await screen.findByRole('dialog', { name: 'Editar ejercicio' })).toBeInTheDocument();
    expect(field('Nombre')).toHaveValue(INCLINE.name);
    expect(field('Grupo muscular')).toHaveValue('chest');
    expect(field('Equipamiento (opcional)')).toHaveValue('dumbbell');
    expect(field('Descripción (opcional)')).toHaveValue(INCLINE.description);
    expect(field('Link del video (opcional)')).toHaveValue(INCLINE.video_url);

    await user.clear(field('Link del video (opcional)'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [patch] = calls(fetchMock).filter(([, init]) => init?.method === 'PATCH');
    expect(patch[0]).toBe('/exercises/ex-incline');
    expect(bodyOf(patch[1])).toEqual({
      name: INCLINE.name,
      muscle_group: 'chest',
      equipment: 'dumbbell',
      description: INCLINE.description,
      video_url: null,
    });
  });
});
