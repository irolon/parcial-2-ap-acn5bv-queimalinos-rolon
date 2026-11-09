import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NOW, apiError, appt, openMyAppointments, requests } from '../../../helpers/agenda/student';
import { bodyOf } from '../../../helpers/shared/fetchMock';
import { cleanUpStudent, signInStudent } from '../../../helpers/student/today';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

beforeEach(() => signInStudent(new Date(NOW)));
afterEach(cleanUpStudent);

const QUESTION = '¿Cancelar el turno del viernes 06/11 a las 18:00?';

async function openDialog(options) {
  const user = userEvent.setup();
  const utils = openMyAppointments({ appointments: [appt()], free: [], ...options });
  const row = (await screen.findByText('Viernes 06/11 · 18:00')).closest('li');
  await user.click(within(row).getByRole('button', { name: 'Cancelar' }));
  return { user, dialog: await screen.findByRole('dialog', { name: 'Cancelar turno' }), ...utils };
}

describe('MyAppointmentsPage: cancelar', () => {
  it('pide confirmación y "Volver" cierra sin mandar nada', async () => {
    const { user, dialog, fetchMock } = await openDialog();
    expect(within(dialog).getByText(QUESTION)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Volver' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(requests(fetchMock, 'PATCH', '/appointments/')).toHaveLength(0);
  });

  it('"Sí, cancelar" manda el PATCH, cierra y la fila queda cancelada al final', async () => {
    const { user, dialog, fetchMock } = await openDialog({
      appointments: [appt(), appt({ id: 'a-2', scheduled_at: '2026-11-10T21:00:00.000Z' })],
    });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [[url, init]] = requests(fetchMock, 'PATCH', '/appointments/');
    expect(url).toMatch(/\/appointments\/a-1$/);
    expect(bodyOf(init)).toEqual({ status: 'cancelled' });
    const list = within(screen.getByRole('list', { name: 'Tus turnos' }));
    await waitFor(() => expect(list.getAllByRole('listitem')[1]).toHaveTextContent('Cancelado'));
    expect(list.getAllByRole('listitem')[1]).toHaveTextContent('Viernes 06/11 · 18:00');
  });

  it('si el servidor lo rechaza muestra su texto, no cierra y vuelve a pedir los turnos', async () => {
    const { user, dialog, fetchMock } = await openDialog({
      cancel: () => apiError(409, 'APPOINTMENT_PAST', 'El turno ya pasó'),
    });
    const before = requests(fetchMock, 'GET', '/appointments?').length;
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('El turno ya pasó');
    expect(screen.getByRole('dialog', { name: 'Cancelar turno' })).toBeInTheDocument();
    await waitFor(() => expect(requests(fetchMock, 'GET', '/appointments?').length).toBeGreaterThan(before));
  });

  it('un doble click rápido manda un solo PATCH', async () => {
    const { dialog, fetchMock } = await openDialog({ cancel: () => new Promise(() => {}) });
    const user = userEvent.setup({ delay: null });
    await user.dblClick(within(dialog).getByRole('button', { name: 'Sí, cancelar' }));
    expect(requests(fetchMock, 'PATCH', '/appointments/')).toHaveLength(1);
  });
});
