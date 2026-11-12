import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { user } from '../../../helpers/shared/user';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { fillRoutine, renderEditor, storeDraft, warmUpEditor } from '../../../helpers/routines/editor';
import { api, open } from '../../../helpers/routines/templates';
import { bodyOf, calls, jsonResponse } from '../../../helpers/shared/fetchMock';

beforeAll(warmUpEditor);

beforeEach(() => {
  resetAuthStore();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const created = () => jsonResponse(201, { data: { id: 'r-1' } });
const routinePost = (fetchMock) => calls(fetchMock).find(([p, init]) => p === '/routines' && init?.method === 'POST');

describe('RoutineEditorPage: nivel de la rutina', () => {
  it('arranca "Sin definir" y el elegido viaja en POST /routines', async () => {
    const create = vi.fn(created);
    const { fetchMock } = await renderEditor({ api: api({ handlers: { create } }) });
    await fillRoutine(['Sentadilla']);
    const level = screen.getByLabelText('Nivel');
    expect(level).toHaveValue('');
    await user.selectOptions(level, 'intermediate');
    await open('Asignar a alumno');
    await user.selectOptions(await screen.findByLabelText('Alumno'), 'st-9');
    await user.click(screen.getByRole('button', { name: 'Asignar' }));
    await vi.waitFor(() => expect(routinePost(fetchMock)).toBeDefined());
    expect(bodyOf(routinePost(fetchMock)[1]).level).toBe('intermediate');
  });

  it('"Usar plantilla" precarga el nivel de la plantilla', async () => {
    await renderEditor({ api: api() });
    await open('Usar plantilla');
    await user.click(await screen.findByRole('button', { name: /Full body/ }));
    await vi.waitFor(() => expect(screen.getByLabelText('Nivel')).toHaveValue('beginner'));
  });

  it('el borrador restaura el nivel', async () => {
    storeDraft({ level: 'advanced' });
    await renderEditor({ api: api() });
    await vi.waitFor(() => expect(screen.getByLabelText('Nivel')).toHaveValue('advanced'));
  });

  it('"Guardar como plantilla" arranca con el nivel de la rutina', async () => {
    await renderEditor({ api: api() });
    await fillRoutine(['Sentadilla']);
    await user.selectOptions(screen.getByLabelText('Nivel'), 'advanced');
    await open('Guardar como plantilla');
    expect(within(screen.getByRole('dialog')).getByLabelText('Nivel (opcional)')).toHaveValue('advanced');
  });
});
