import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { setupUser } from '../../../helpers/shared/user';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { LIBRARY, exercise } from '../../../helpers/exercises/fixtures';
import { PAGE_PATH, page, stubLibrary } from '../../../helpers/exercises/library';
import { TRAINER, renderRoute, setSession } from '../../../helpers/routes/renderRoute';
import { bodyOf, calls, jsonResponse } from '../../../helpers/shared/fetchMock';

const form = () => within(screen.getByRole('dialog'));
const warning = () => form().queryByRole('status');

async function load(handlers = {}) {
  const fetchMock = stubLibrary({ handlers });
  renderRoute(PAGE_PATH);
  await screen.findByText(/^\d+ EJERCICIOS$/);
  return { fetchMock, user: setupUser() };
}

async function openCreate(user) {
  await user.click(page().getByRole('button', { name: 'Nuevo ejercicio' }));
  await screen.findByRole('dialog', { name: 'Nuevo ejercicio' });
}

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ExerciseLibraryPage: aviso de nombre repetido', () => {
  it('avisa si el nombre coincide con uno global sin importar mayúsculas, tildes ni espacios', async () => {
    const { fetchMock, user } = await load();
    await openCreate(user);
    expect(warning()).not.toBeInTheDocument();
    const before = calls(fetchMock).length;

    await user.type(form().getByLabelText('Nombre'), '  PRÉSS   banca plano');

    expect(warning()).toHaveTextContent('Ya hay un ejercicio global llamado «Press banca plano». Podés guardarlo igual.');
    expect(calls(fetchMock)).toHaveLength(before); // compara contra lo cargado, sin pedir nada
  });

  it('avisa si coincide con uno propio y el aviso se va al cambiar el nombre', async () => {
    const { user } = await load();
    await openCreate(user);
    const name = form().getByLabelText('Nombre');
    await user.type(name, 'elevacion de talones');
    expect(warning()).toHaveTextContent('Ya hay un ejercicio propio llamado «Elevación de talones».');

    await user.type(name, ' sentado');
    expect(warning()).not.toBeInTheDocument();
  });

  it('no bloquea: con el aviso visible, Guardar manda el POST', async () => {
    const create = vi.fn(() => jsonResponse(201, { data: exercise({ name: 'Plancha', is_global: false }) }));
    const { fetchMock, user } = await load({ create });
    await openCreate(user);
    await user.type(form().getByLabelText('Nombre'), 'Plancha');
    await user.selectOptions(form().getByLabelText('Grupo muscular'), 'core');
    expect(warning()).toBeInTheDocument();

    await user.click(form().getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [post] = calls(fetchMock).filter(([, init]) => init?.method === 'POST');
    expect(bodyOf(post[1]).name).toBe('Plancha');
  });

  it('al editar ignora el propio ejercicio y avisa si el nombre nuevo choca con otro', async () => {
    const { user } = await load();
    await user.click(page().getByRole('button', { name: 'Editar Press inclinado con mancuernas' }));
    await screen.findByRole('dialog', { name: 'Editar ejercicio' });
    expect(warning()).not.toBeInTheDocument();

    const name = form().getByLabelText('Nombre');
    await user.clear(name);
    await user.type(name, LIBRARY.find((e) => e.id === 'ex-squat').name);

    expect(warning()).toHaveTextContent('Ya hay un ejercicio global llamado «Sentadilla».');
  });
});
