import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { stub } from '../../../helpers/messages/ptMessages';
import { bodyOf, calls, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { TRAINER, renderRoute, setSession } from '../../../helpers/routes/renderRoute';


beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('MessagesPage: envío masivo', () => {
  async function openDialog(user) {
    await screen.findByRole('button', { name: /Ana Paz/ });
    await user.click(screen.getByRole('button', { name: 'Envío masivo' }));
    return screen.findByRole('dialog', { name: 'Envío masivo' });
  }

  it('muestra el aviso fijo y el botón está deshabilitado sin texto o sin alumnos', async () => {
    const user = userEvent.setup();
    stub();
    renderRoute('/pt/mensajes');
    const dialog = await openDialog(user);
    expect(within(dialog).getByText(/No es un chat grupal: no se ven entre ellos\./)).toBeInTheDocument();
    const send = within(dialog).getByRole('button', { name: 'Enviar a 0 alumnos' });
    expect(send).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox', { name: 'Mensaje' }), 'Hola');
    expect(send).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox', { name: /Ana Paz/ }));
    expect(within(dialog).getByRole('button', { name: 'Enviar a 1 alumno' })).toBeEnabled();
    await user.clear(within(dialog).getByRole('textbox', { name: 'Mensaje' }));
    expect(within(dialog).getByRole('button', { name: 'Enviar a 1 alumno' })).toBeDisabled();
  });

  it('"Todos" selecciona y deselecciona; envía, avisa "Enviado a N alumnos" y cierra', async () => {
    const user = userEvent.setup();
    const fetchMock = stub();
    renderRoute('/pt/mensajes');
    const dialog = await openDialog(user);
    const all = within(dialog).getByRole('checkbox', { name: 'Todos' });
    await user.click(all);
    expect(within(dialog).getByRole('checkbox', { name: /Bruno Sosa/ })).toBeChecked();
    expect(within(dialog).getByRole('button', { name: 'Enviar a 3 alumnos' })).toBeDisabled();
    await user.click(all);
    expect(within(dialog).getByRole('button', { name: 'Enviar a 0 alumnos' })).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox', { name: /Ana Paz/ }));
    await user.click(within(dialog).getByRole('checkbox', { name: /Bruno Sosa/ }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Mensaje' }), '  Mañana no abrimos ');
    await user.click(within(dialog).getByRole('button', { name: 'Enviar a 2 alumnos' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Enviado a 2 alumnos');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const post = calls(fetchMock).find(([u]) => u === '/messages/broadcast');
    expect(bodyOf(post[1])).toEqual({ student_ids: ['s-1', 's-3'], body: 'Mañana no abrimos' });
  });

  it('"Todos" queda indeterminado con selección parcial', async () => {
    const user = userEvent.setup();
    stub();
    renderRoute('/pt/mensajes');
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('checkbox', { name: /Ana Paz/ }));
    expect(within(dialog).getByRole('checkbox', { name: 'Todos' }).indeterminate).toBe(true);
  });

  it('cancelar y reabrir deja el diálogo en blanco', async () => {
    const user = userEvent.setup();
    stub();
    renderRoute('/pt/mensajes');
    let dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('checkbox', { name: /Ana Paz/ }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Mensaje' }), 'Hola');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    dialog = await openDialog(user);
    expect(within(dialog).getByRole('button', { name: 'Enviar a 0 alumnos' })).toBeDisabled();
    expect(within(dialog).getByRole('textbox', { name: 'Mensaje' })).toHaveValue('');
  });

  it('durante el envío no se puede cancelar ni cerrar con Esc', async () => {
    const user = userEvent.setup();
    let release;
    stub({
      '/messages/broadcast': () =>
        new Promise((resolve) => {
          release = () => resolve(jsonResponse(201, { data: { broadcast_id: 'b', sent: 1 } }));
        }),
    });
    renderRoute('/pt/mensajes');
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('checkbox', { name: /Ana Paz/ }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Mensaje' }), 'Hola');
    await user.click(within(dialog).getByRole('button', { name: 'Enviar a 1 alumno' }));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled());
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    release();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('un error del servidor se muestra y el diálogo sigue abierto', async () => {
    const user = userEvent.setup();
    stub({ '/messages/broadcast': () => errorResponse(403, 'FORBIDDEN', 'Alumno ajeno') });
    renderRoute('/pt/mensajes');
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('checkbox', { name: 'Todos' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Mensaje' }), 'Hola');
    await user.click(within(dialog).getByRole('button', { name: 'Enviar a 3 alumnos' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Alumno ajeno');
  });
});
