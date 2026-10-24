import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { LIBRARY, exercise } from '../../helpers/exercises/fixtures';
import { PAGE_PATH, page, stubLibrary } from '../../helpers/exercises/library';
import { TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { calls, errorResponse, jsonResponse } from '../../helpers/shared/fetchMock';

const IN_USE = 'No podés borrar este ejercicio porque está en una rutina o en el historial de un alumno';
const gets = (fetchMock) => calls(fetchMock).filter(([, init]) => (init?.method ?? 'GET') === 'GET');
const dialog = () => within(screen.getByRole('dialog'));

async function openPage(options) {
  const fetchMock = stubLibrary(options);
  renderRoute(PAGE_PATH);
  await screen.findByText(/^\d+ EJERCICIOS$/);
  return { fetchMock, user: userEvent.setup() };
}

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('ExerciseLibraryPage: detalle', () => {
  it('muestra un ejercicio global sin video ni acciones de edición', async () => {
    const { user } = await openPage();
    await user.click(page().getByRole('button', { name: /Plancha/ }));

    expect(await screen.findByRole('dialog', { name: 'Plancha' })).toBeInTheDocument();
    expect(dialog().getByText('Core')).toBeInTheDocument();
    expect(dialog().getByText('Peso corporal')).toBeInTheDocument();
    expect(dialog().getByText(LIBRARY.find((e) => e.id === 'ex-plank').description)).toBeInTheDocument();
    expect(dialog().queryByRole('link', { name: 'Ver video' })).not.toBeInTheDocument();
    expect(dialog().queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(dialog().queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument();
  });

  it('muestra el link al video en una pestaña nueva', async () => {
    const { user } = await openPage();
    await user.click(page().getByRole('button', { name: /Press banca plano/ }));

    const link = await screen.findByRole('link', { name: 'Ver video' });
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=uEtiwYaT3d0');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('no muestra el link si el video no es http/https', async () => {
    const unsafe = exercise({ id: 'ex-unsafe', name: 'Peligroso', video_url: 'javascript:alert(1)' });
    const { user } = await openPage({ list: [unsafe] });
    await user.click(page().getByRole('button', { name: /Peligroso/ }));

    expect(await screen.findByRole('dialog', { name: 'Peligroso' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver video' })).not.toBeInTheDocument();
  });

  it('desde el detalle de un propio, Editar abre el formulario de edición', async () => {
    const { user } = await openPage();
    await user.click(page().getByRole('button', { name: /^Press inclinado/ }));
    await screen.findByRole('dialog', { name: 'Press inclinado con mancuernas' });
    expect(dialog().getByText('PROPIO')).toBeInTheDocument();
    await user.click(dialog().getByRole('button', { name: 'Editar' }));

    expect(await screen.findByRole('dialog', { name: 'Editar ejercicio' })).toBeInTheDocument();
  });
});

describe('ExerciseLibraryPage: borrar ejercicio', () => {
  it('confirma, manda DELETE, cierra y vuelve a pedir la lista', async () => {
    const remove = vi.fn(() => new Response(null, { status: 204 }));
    const { fetchMock, user } = await openPage({ handlers: { remove } });
    await user.click(page().getByRole('button', { name: 'Borrar Press inclinado con mancuernas' }));

    expect(await screen.findByRole('dialog', { name: '¿Borrar «Press inclinado con mancuernas»?' })).toBeInTheDocument();
    expect(dialog().getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
    const before = gets(fetchMock).length;
    await user.click(dialog().getByRole('button', { name: 'Borrar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [del] = calls(fetchMock).filter(([, init]) => init?.method === 'DELETE');
    expect(del[0]).toBe('/exercises/ex-incline');
    await waitFor(() => expect(gets(fetchMock).length).toBeGreaterThan(before));
  });

  it('muestra el 409 EXERCISE_IN_USE y deja el diálogo abierto', async () => {
    const remove = () => errorResponse(409, 'EXERCISE_IN_USE', IN_USE);
    const { user } = await openPage({ handlers: { remove } });
    await user.click(page().getByRole('button', { name: 'Borrar Press inclinado con mancuernas' }));
    await screen.findByRole('dialog');
    await user.click(dialog().getByRole('button', { name: 'Borrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(IN_USE);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('al borrar el último propio vuelve a "Todos" y quita su chip', async () => {
    const calf = LIBRARY.find((e) => e.id === 'ex-calf');
    const globals = LIBRARY.filter((e) => e.is_global);
    let listed = 0;
    const fetchMock = stubLibrary({ list: [], handlers: { remove: () => new Response(null, { status: 204 }) } });
    fetchMock.mockImplementation(async (url, init = {}) => {
      if ((init.method ?? 'GET') === 'DELETE') return new Response(null, { status: 204 });
      listed += 1;
      return jsonResponse(200, { data: listed === 1 ? [...globals, calf] : globals });
    });
    renderRoute(PAGE_PATH);
    await screen.findByText(/^\d+ EJERCICIOS$/);
    const user = userEvent.setup();
    await user.click(page().getByRole('radio', { name: 'Propios' }));
    await user.click(page().getByRole('radio', { name: 'Gemelos' }));
    await user.click(page().getByRole('button', { name: 'Borrar Elevación de talones' }));
    await screen.findByRole('dialog');
    await user.click(dialog().getByRole('button', { name: 'Borrar' }));

    expect(await screen.findByText('Todavía no creaste ejercicios propios')).toBeInTheDocument();
    expect(page().queryByRole('radio', { name: 'Gemelos' })).not.toBeInTheDocument();
    expect(within(page().getByRole('radiogroup', { name: 'Grupo muscular' })).getByRole('radio', { name: 'Todos' })).toHaveAttribute('aria-checked', 'true');
  });
});
