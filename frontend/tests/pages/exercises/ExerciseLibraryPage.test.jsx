import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { LIBRARY, exercise } from '../../helpers/exercises/fixtures';
import { PAGE_PATH, page, stubLibrary } from '../../helpers/exercises/library';
import { TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const names = () =>
  page()
    .getAllByRole('listitem')
    .map((li) => li.querySelector('[title]').title);

const load = async (stub = {}) => {
  const fetchMock = stubLibrary(stub);
  renderRoute(PAGE_PATH);
  await screen.findByText(/^\d+ EJERCICIOS$/);
  return fetchMock;
};

describe('ExerciseLibraryPage: carga', () => {
  it('muestra topbar, Biblioteca activo, contador y una sola request', async () => {
    const fetchMock = await load();
    expect(screen.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
    const link = within(screen.getByTestId('sidebar-fixed')).getByRole('link', { name: 'Biblioteca' });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(page().getByText('5 EJERCICIOS')).toBeInTheDocument();
    expect(page().getByRole('button', { name: 'Nuevo ejercicio' })).toBeInTheDocument();
    expect(calls(fetchMock).filter(([path]) => path === '/exercises')).toHaveLength(1);
  });

  it('muestra el skeleton mientras la request está pendiente', async () => {
    stubFetch(() => new Promise(() => {}));
    renderRoute(PAGE_PATH);
    expect(await screen.findByText('Cargando ejercicios…')).toBeInTheDocument();
  });

  it('ante un 500 muestra el error y Reintentar vuelve a pedir', async () => {
    const fetchMock = stubFetch(async () => errorResponse(500, 'INTERNAL', 'Se rompió'));
    renderRoute(PAGE_PATH);
    expect(await screen.findByText('Algo salió mal')).toBeInTheDocument();
    fetchMock.mockImplementation(async () => jsonResponse(200, { data: LIBRARY }));
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('5 EJERCICIOS')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('ExerciseLibraryPage: filtros', () => {
  it('ofrece los chips del backend y filtra por Pecho', async () => {
    await load();
    const group = page().getByRole('radiogroup', { name: 'Grupo muscular' });
    expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual([
      'Todos', 'Pecho', 'Piernas', 'Core', 'Gemelos',
    ]);
    await userEvent.click(within(group).getByRole('radio', { name: 'Pecho' }));
    expect(within(group).getByRole('radio', { name: 'Pecho' })).toHaveAttribute('aria-checked', 'true');
    expect(names()).toEqual(['Press banca plano', 'Press inclinado con mancuernas']);
  });

  it('la búsqueda ignora tildes y no vuelve a pedir', async () => {
    const fetchMock = await load();
    await userEvent.type(page().getByRole('searchbox', { name: 'Buscar ejercicio' }), 'elevacion');
    expect(names()).toEqual(['Elevación de talones']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('combina equipamiento y músculo; Limpiar filtros restablece', async () => {
    await load();
    await userEvent.click(page().getByRole('radio', { name: 'Pecho' }));
    await userEvent.selectOptions(page().getByLabelText('Equipamiento'), 'Barra');
    expect(names()).toEqual(['Press banca plano']);
    await userEvent.selectOptions(page().getByLabelText('Equipamiento'), 'Peso corporal');
    expect(page().getByText('Ningún ejercicio coincide')).toBeInTheDocument();
    await userEvent.click(page().getByRole('button', { name: 'Limpiar filtros' }));
    expect(names()).toHaveLength(5);
    expect(page().getByLabelText('Equipamiento')).toHaveValue('');
  });

  it('Propios sin ejercicios propios muestra el vacío con su botón', async () => {
    await load({ list: LIBRARY.filter((e) => e.is_global) });
    const origin = page().getByRole('radiogroup', { name: 'Origen' });
    await userEvent.click(within(origin).getByRole('radio', { name: 'Propios' }));
    expect(page().getByText('Todavía no creaste ejercicios propios')).toBeInTheDocument();
    expect(page().getByText('Creá el primero con su video para usarlo en tus rutinas.')).toBeInTheDocument();
    expect(page().getAllByRole('button', { name: 'Nuevo ejercicio' })).toHaveLength(2);
  });
});

describe('ExerciseLibraryPage: tarjetas', () => {
  it('globales sin acciones; propios con badge y acciones', async () => {
    await load();
    expect(page().queryByRole('button', { name: 'Editar Sentadilla' })).not.toBeInTheDocument();
    expect(page().queryByRole('button', { name: 'Borrar Sentadilla' })).not.toBeInTheDocument();
    expect(page().getAllByText('PROPIO')).toHaveLength(2);
    expect(page().getByRole('button', { name: 'Editar Elevación de talones' })).toBeInTheDocument();
    expect(page().getByRole('button', { name: 'Borrar Elevación de talones' })).toBeInTheDocument();
    expect(page().getByText('PECHO · BARRA')).toBeInTheDocument();
    expect(page().getByText('GEMELOS')).toBeInTheDocument();
  });

  it('el nombre largo lleva title con el texto completo', async () => {
    const name = 'A'.repeat(120);
    await load({ list: [exercise({ name })] });
    expect(page().getByTitle(name)).toBeInTheDocument();
  });

  it('muestra la miniatura de YouTube y un placeholder sin video', async () => {
    await load();
    const cards = page().getAllByRole('listitem');
    const find = (text) => cards.find((li) => within(li).queryByText(text));
    const img = find('Press banca plano').querySelector('img');
    expect(img).toHaveAttribute('src', 'https://img.youtube.com/vi/uEtiwYaT3d0/hqdefault.jpg');
    expect(find('Plancha').querySelector('img')).toBeNull();
  });
});
