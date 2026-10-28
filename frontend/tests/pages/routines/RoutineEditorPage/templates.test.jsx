import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { LIBRARY } from '../../../helpers/exercises/fixtures';
import { fillRoutine, renderEditor, rowNames } from '../../../helpers/routines/editor';
import { stubRoutinesApi } from '../../../helpers/routines/routines';
import { TRAINER, renderRoute, setSession } from '../../../helpers/routes/renderRoute';
import { bodyOf, calls, jsonResponse } from '../../../helpers/shared/fetchMock';
import { DETAIL, api, item, open, post } from '../../../helpers/routines/templates';


beforeEach(() => {
  resetAuthStore();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const chooseTemplate = () => userEvent.click(screen.getByRole('button', { name: /Full body/ }));

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

describe('RoutineEditorPage: usar plantilla con el detalle caído', () => {
  /** Hace fallar `GET /routine-templates/t-1` las primeras `times` veces. */
  async function renderFailingDetail(times) {
    const { fetchMock } = await renderEditor({ api: api() });
    const original = fetchMock.getMockImplementation();
    let left = times;
    fetchMock.mockImplementation(async (url, init) => {
      if (url.endsWith('/routine-templates/t-1') && left-- > 0) return new Response('{}', { status: 500 });
      return original(url, init);
    });
    await open('Usar plantilla');
    await chooseTemplate();
    await screen.findByText('No pudimos cargar la plantilla');
  }

  it('"Reintentar" vuelve a pedir el detalle y precarga', async () => {
    await renderFailingDetail(1);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await vi.waitFor(() => expect(rowNames()).toEqual(['Sentadilla', 'Plancha']));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('"Elegir otra" vuelve al listado', async () => {
    await renderFailingDetail(5);
    await userEvent.click(screen.getByRole('button', { name: 'Elegir otra' }));
    expect(await screen.findByRole('button', { name: /Full body/ })).toBeVisible();
    expect(screen.queryByText('No pudimos cargar la plantilla')).not.toBeInTheDocument();
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
