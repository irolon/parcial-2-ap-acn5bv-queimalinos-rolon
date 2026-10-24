import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { LIBRARY } from '../../../helpers/exercises/fixtures';
import { PAGE_PATH, page, stubLibrary } from '../../../helpers/exercises/library';
import { TRAINER, renderRoute, setSession } from '../../../helpers/routes/renderRoute';
import { jsonResponse } from '../../../helpers/shared/fetchMock';

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const OWN = LIBRARY.find((e) => e.id === 'ex-incline');

/** Handler que no responde hasta que se llama a `release()`. */
function deferred(response) {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  return { handler: () => gate.then(() => response()), release: () => release() };
}

async function openWith(handlers, buttonName) {
  stubLibrary({ handlers });
  renderRoute(PAGE_PATH);
  await screen.findByText(/^\d+ EJERCICIOS$/);
  const user = userEvent.setup();
  await user.click(page().getByRole('button', { name: buttonName }));
  return user;
}

describe('ExerciseLibraryPage: no se cierra mientras guarda o borra', () => {
  it('el formulario ignora Escape y deshabilita la X con el PATCH pendiente; al resolver cierra', async () => {
    const gate = deferred(() => jsonResponse(200, { data: OWN }));
    const user = await openWith({ update: gate.handler }, `Editar ${OWN.name}`);
    await screen.findByRole('dialog', { name: 'Editar ejercicio' });
    await user.type(screen.getByLabelText('Nombre'), ' X');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Cerrar' })).toBeDisabled());
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Editar ejercicio' })).toBeInTheDocument();

    gate.release();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('la confirmación de borrado ignora Escape con el DELETE pendiente; al resolver cierra', async () => {
    const gate = deferred(() => new Response(null, { status: 204 }));
    const user = await openWith({ remove: gate.handler }, `Borrar ${OWN.name}`);
    const dialog = await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Borrar' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Cerrar' })).toBeDisabled());
    await user.keyboard('{Escape}');
    expect(dialog).toBeInTheDocument();

    gate.release();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
