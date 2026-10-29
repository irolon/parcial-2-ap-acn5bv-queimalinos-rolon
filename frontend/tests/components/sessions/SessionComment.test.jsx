import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionsHistory from '@/components/sessions/SessionsHistory';
import { bodyOf, errorResponse, jsonResponse } from '../../helpers/shared/fetchMock';
import {
  renderWithQuery,
  sessionDetailItem,
  sessionItem,
  sessionsPage,
  stubSessions,
} from '../../helpers/sessions/sessions';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function open({ comment, trainer_comment = null } = {}) {
  const user = userEvent.setup();
  const state = { value: trainer_comment };
  const handler = vi.fn(comment ?? (async (init) => {
    state.value = bodyOf(init).trainer_comment || null;
    return jsonResponse(200, { data: sessionItem({ trainer_comment: state.value }) });
  }));
  stubSessions({
    sessions: () => sessionsPage([sessionItem({ trainer_comment: state.value })]),
    details: () => sessionDetailItem({ trainer_comment: state.value }),
    comment: handler,
  });
  renderWithQuery(<SessionsHistory studentId="st-1" />);
  await user.click(await screen.findByRole('button', { name: 'Detalle' }));
  const box = await screen.findByLabelText('Comentario del entrenador');
  return { user, box, handler };
}

describe('SessionComment', () => {
  it('Guardar y Cancelar aparecen recién cuando cambia el texto, y Cancelar vuelve al valor', async () => {
    const { user, box } = await open({ trainer_comment: 'Bien' });
    expect(box).toHaveValue('Bien');
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull();
    await user.type(box, '!!');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(box).toHaveValue('Bien');
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull();
  });

  it('guarda con el botón: manda el texto y actualiza la fila', async () => {
    const { user, box, handler } = await open();
    await user.type(box, 'Muy bien');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull());
    expect(bodyOf(handler.mock.calls[0][0])).toEqual({ trainer_comment: 'Muy bien' });
    expect((await screen.findAllByText('Muy bien')).length).toBeGreaterThan(0);
    expect(screen.getByRole('listitem')).toHaveTextContent('Muy bien');
  });

  it('Ctrl+Enter guarda', async () => {
    const { user, box, handler } = await open();
    await user.type(box, 'Rápido{Control>}{Enter}{/Control}');
    await waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    expect(bodyOf(handler.mock.calls[0][0])).toEqual({ trainer_comment: 'Rápido' });
  });

  it('vaciar el texto manda "" para borrar el comentario', async () => {
    const { user, box, handler } = await open({ trainer_comment: 'Viejo' });
    await user.clear(box);
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    expect(bodyOf(handler.mock.calls[0][0])).toEqual({ trainer_comment: '' });
  });

  it('doble click en Guardar manda un solo PATCH y muestra "Guardando…"', async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const comment = async () => {
      await gate;
      return jsonResponse(200, { data: sessionItem() });
    };
    const { user, box, handler } = await open({ comment });
    await user.type(box, 'Hola');
    await user.dblClick(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('button', { name: 'Guardando…' })).toBeDisabled();
    release();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardando…' })).toBeNull());
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+Enter repetido mientras va el PATCH manda uno solo', async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const comment = async () => {
      await gate;
      return jsonResponse(200, { data: sessionItem() });
    };
    const { user, box, handler } = await open({ comment });
    await user.type(box, 'Hola');
    await user.keyboard('{Control>}{Enter}{Enter}{/Control}');
    await user.keyboard('{Control>}{Enter}{/Control}');
    release();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardando…' })).toBeNull());
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('al volver a editar tras un error, el error desaparece', async () => {
    const comment = async () => errorResponse(500, 'INTERNAL', 'No se pudo guardar');
    const { user, box } = await open({ comment });
    await user.type(box, 'Hola');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toBeVisible();
    await user.type(box, '!');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('si falla muestra el error inline y conserva el texto', async () => {
    const comment = async () => errorResponse(500, 'INTERNAL', 'No se pudo guardar');
    const { user, box } = await open({ comment });
    await user.type(box, 'Hola');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar');
    expect(box).toHaveValue('Hola');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });
});
