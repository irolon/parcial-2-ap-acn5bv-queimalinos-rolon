import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { LIBRARY, exercise } from '../../../helpers/exercises/fixtures';
import { PAGE_PATH, page, stubLibrary } from '../../../helpers/exercises/library';
import { TRAINER, renderRoute, setSession } from '../../../helpers/routes/renderRoute';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';

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

const NAME_ERROR = 'El nombre debe tener entre 2 y 120 caracteres';

const load = async (stub = {}) => {
  const fetchMock = stubLibrary(stub);
  renderRoute(PAGE_PATH);
  await screen.findByText(/^\d+ EJERCICIOS$/);
  return fetchMock;
};

const posts = (fetchMock) => calls(fetchMock).filter(([, init]) => init?.method === 'POST');
const gets = (fetchMock) => calls(fetchMock).filter(([, init]) => (init?.method ?? 'GET') === 'GET');
const dialog = () => screen.queryByRole('dialog');

async function openCreate(user) {
  await user.click(page().getByRole('button', { name: 'Nuevo ejercicio' }));
  return screen.findByRole('dialog', { name: 'Nuevo ejercicio' });
}

async function fillRequired(user) {
  await user.type(field('Nombre'), 'Remo');
  await user.selectOptions(field('Grupo muscular'), 'back');
}

describe('ExerciseLibraryPage: crear ejercicio', () => {
  it('crea con un solo POST, cierra el modal, recarga la lista y muestra la tarjeta PROPIO', async () => {
    const created = exercise({
      id: 'ex-new',
      name: 'Remo con banda',
      muscle_group: 'back',
      equipment: 'band',
      description: null,
      video_url: 'https://youtu.be/abc123def45',
      trainer_id: 't-1',
      is_global: false,
    });
    let list = LIBRARY;
    const fetchMock = stubFetch(async (url, init = {}) => {
      if ((init.method ?? 'GET') === 'GET') return jsonResponse(200, { data: list });
      list = [...LIBRARY, created];
      return jsonResponse(201, { data: created });
    });
    renderRoute(PAGE_PATH);
    await screen.findByText(/^\d+ EJERCICIOS$/);
    const user = userEvent.setup();
    await openCreate(user);
    await user.type(field('Nombre'), 'Remo con banda');
    await user.selectOptions(field('Grupo muscular'), 'back');
    await user.selectOptions(field('Equipamiento (opcional)'), 'band');
    await user.type(field('Link del video (opcional)'), 'https://youtu.be/abc123def45');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    const sent = posts(fetchMock);
    expect(sent).toHaveLength(1);
    expect(sent[0][0]).toBe('/exercises');
    expect(bodyOf(sent[0][1])).toEqual({
      name: 'Remo con banda',
      muscle_group: 'back',
      equipment: 'band',
      description: null,
      video_url: 'https://youtu.be/abc123def45',
    });
    const card = (await page().findByTitle('Remo con banda')).closest('li');
    expect(card).toHaveTextContent('PROPIO');
    expect(gets(fetchMock)).toHaveLength(2);
  });

  it('un doble click en Guardar manda un solo POST', async () => {
    let release;
    const fetchMock = await load({
      handlers: {
        create: () =>
          new Promise((resolve) => {
            release = () => resolve(jsonResponse(201, { data: exercise() }));
          }),
      },
    });
    const user = userEvent.setup();
    await openCreate(user);
    await fillRequired(user);
    await user.dblClick(screen.getByRole('button', { name: 'Guardar' }));
    expect(posts(fetchMock)).toHaveLength(1);
    release();
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
  });

  it('Cancelar queda deshabilitado mientras se guarda', async () => {
    let release;
    await load({
      handlers: {
        create: () =>
          new Promise((resolve) => {
            release = () => resolve(jsonResponse(201, { data: exercise() }));
          }),
      },
    });
    const user = userEvent.setup();
    await openCreate(user);
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled());
    release();
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
  });

  it('un 400 VALIDATION_ERROR muestra el mensaje bajo el campo y deja el modal abierto', async () => {
    await load({
      handlers: {
        create: () =>
          errorResponse(400, 'VALIDATION_ERROR', 'Datos inválidos', [{ field: 'video_url', message: 'X' }]),
      },
    });
    const user = userEvent.setup();
    await openCreate(user);
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('X')).toBeInTheDocument();
    expect(field('Link del video (opcional)')).toHaveAccessibleDescription(/X/);
    expect(dialog()).toBeInTheDocument();
  });

  it('la validación local frena el envío', async () => {
    const fetchMock = await load();
    const user = userEvent.setup();
    await openCreate(user);
    await user.type(field('Nombre'), 'A');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText(NAME_ERROR)).toBeInTheDocument();
    expect(screen.getByText('Elegí un grupo muscular')).toBeInTheDocument();
    expect(posts(fetchMock)).toHaveLength(0);
  });

  it('al cerrar con errores y volver a abrir, el formulario arranca limpio', async () => {
    await load();
    const user = userEvent.setup();
    await openCreate(user);
    await user.type(field('Nombre'), 'A');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await screen.findByText(NAME_ERROR);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    await openCreate(user);
    expect(screen.queryByText(NAME_ERROR)).not.toBeInTheDocument();
    expect(field('Nombre')).toHaveValue('');
  });
});
