import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FRIDAY_18, NOW, apiError, appt, openMyAppointments, requests } from '../../../helpers/agenda/student';
import { bodyOf } from '../../../helpers/shared/fetchMock';
import { cleanUpStudent, signInStudent } from '../../../helpers/student/today';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

beforeEach(() => signInStudent(new Date(NOW)));
afterEach(cleanUpStudent);

const NOTICE = 'Turno pedido: tu entrenador lo tiene que confirmar.';
const LIMIT = 'Ya tenés 3 turnos pendientes: esperá a que tu entrenador los confirme';

async function openDialog(options, user = userEvent.setup()) {
  const utils = openMyAppointments(options);
  await user.click(await screen.findByRole('button', { name: 'Pedir turno el viernes 06/11 a las 18:00' }));
  return { user, dialog: await screen.findByRole('dialog', { name: 'Pedir turno' }), ...utils };
}
const posts = (fetchMock) => requests(fetchMock, 'POST', '/appointments');
const send = (user, dialog) => user.click(within(dialog).getByRole('button', { name: 'Pedir turno' }));

describe('MyAppointmentsPage: pedir turno', () => {
  it('el chip abre el diálogo con el día y la hora', async () => {
    const { dialog } = await openDialog();
    expect(within(dialog).getByText('Viernes 06/11 · 18:00')).toBeInTheDocument();
    expect(within(dialog).getByText('0/500')).toBeInTheDocument();
  });

  it('la nota se corta en 500 y el contador se actualiza', async () => {
    const { user, dialog } = await openDialog();
    const note = within(dialog).getByLabelText('Nota (opcional)');
    expect(note).toHaveAttribute('maxLength', '500');
    await user.type(note, 'a'.repeat(120));
    expect(within(dialog).getByText('120/500')).toBeInTheDocument();
  });

  it('con la nota vacía manda solo el scheduled_at del servidor', async () => {
    const { user, dialog, fetchMock } = await openDialog();
    await user.type(within(dialog).getByLabelText('Nota (opcional)'), '   ');
    await send(user, dialog);
    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1));
    expect(bodyOf(posts(fetchMock)[0][1])).toEqual({ scheduled_at: FRIDAY_18 });
  });

  it('con nota la manda recortada; al salir bien se cierra, avisa y el turno aparece en la lista', async () => {
    const { user, dialog, fetchMock } = await openDialog();
    await user.type(within(dialog).getByLabelText('Nota (opcional)'), '  Llego del trabajo ');
    await send(user, dialog);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(bodyOf(posts(fetchMock)[0][1])).toEqual({ scheduled_at: FRIDAY_18, notes: 'Llego del trabajo' });
    expect(await screen.findByText(NOTICE)).toHaveAttribute('role', 'status');
    const list = within(await screen.findByRole('list', { name: 'Tus turnos' }));
    expect(list.getByText('Viernes 06/11 · 18:00')).toBeInTheDocument();
    expect(list.getByText('Pendiente')).toBeInTheDocument();
  });

  it('SLOT_TAKEN muestra el texto del servidor, vuelve a pedir los libres y "Volver" cierra', async () => {
    const { user, dialog, fetchMock } = await openDialog({
      create: () => apiError(409, 'SLOT_TAKEN', 'Ese horario ya está ocupado'),
    });
    const before = requests(fetchMock, 'GET', '/availability/free?').length;
    await send(user, dialog);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Ese horario ya está ocupado');
    await waitFor(() => expect(requests(fetchMock, 'GET', '/availability/free?').length).toBeGreaterThan(before));
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Volver' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('sin red lo dice y deja volver a intentar', async () => {
    const { user, dialog } = await openDialog({
      create: () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await send(user, dialog);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No hay conexión con el servidor');
    expect(within(dialog).getByRole('button', { name: 'Pedir turno' })).toBeEnabled();
  });

  it('APPOINTMENT_LIMIT con 2 en la lista: el texto del servidor y, al volver, los chips deshabilitados', async () => {
    const two = [1, 2].map((n) => appt({ id: `p-${n}`, scheduled_at: `2026-11-1${n}T21:00:00.000Z` }));
    let reads = 0;
    const third = appt({ id: 'p-3', scheduled_at: '2026-11-13T21:00:00.000Z' });
    const { user, dialog } = await openDialog({
      appointments: () => (reads++ === 0 ? two : [...two, third]),
      create: () => apiError(409, 'APPOINTMENT_LIMIT', LIMIT),
    });
    await send(user, dialog);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(LIMIT);
    await user.click(within(dialog).getByRole('button', { name: 'Volver' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Pedir turno el viernes 06/11 a las 18:00' })).toBeDisabled(),
    );
  });

  it('un doble click rápido manda un solo POST y, mientras va, el diálogo no se cierra', async () => {
    const { dialog, fetchMock } = await openDialog({ create: () => new Promise(() => {}) });
    const user = userEvent.setup({ delay: null });
    await user.dblClick(within(dialog).getByRole('button', { name: 'Pedir turno' }));
    expect(posts(fetchMock)).toHaveLength(1);
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Pedir turno' })).toHaveAttribute('aria-busy'));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Pedir turno' })).toBeInTheDocument();
  });
});
