import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NOW, appt, openMyAppointments } from '../../../helpers/agenda/student';
import { cleanUpStudent, signInStudent } from '../../../helpers/student/today';
import { allowSlowScreens } from '../../../helpers/shared/patience';
import { NOTICE_MS } from '@/utils/agenda/studentAgenda';

allowSlowScreens();

// Hoy es miércoles 04/11 a las 12:00 en Argentina. Los timers son falsos pero corren solos (shouldAdvanceTime), así
// las consultas y los findBy siguen andando; advanceTimersByTime salta el reloj sin remontar la página.
beforeEach(() => {
  signInStudent(new Date(NOW));
  vi.useFakeTimers({
    toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    shouldAdvanceTime: true,
    now: new Date(NOW),
  });
});
afterEach(cleanUpStudent);

const NOTICE = 'Turno pedido: tu entrenador lo tiene que confirmar.';
const CHIP = 'Pedir turno el viernes 06/11 a las 18:00';
const jump = (ms) => act(() => vi.advanceTimersByTime(ms));
const rowOf = async (text) => (await screen.findByText(text)).closest('li');

/** Tres pendientes; el primero hoy a las 12:05. */
const THREE = [
  appt({ id: 'p-1', scheduled_at: '2026-11-04T15:05:00.000Z' }),
  appt({ id: 'p-2', scheduled_at: '2026-11-10T21:00:00.000Z' }),
  appt({ id: 'p-3', scheduled_at: '2026-11-11T21:00:00.000Z' }),
];

describe('MyAppointmentsPage: el reloj', () => {
  it('al empezar un turno pasa a "Ya pasó" y libera el límite de pendientes, sin recargar', async () => {
    openMyAppointments({ appointments: THREE });
    const row = await rowOf('Miércoles 04/11 · 12:05');
    expect(within(row).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: CHIP })).toBeDisabled();

    // De a un minuto: cada tick deja el próximo timer en un efecto, que React corre al cerrar el act.
    for (let minute = 0; minute < 5; minute += 1) await jump(60_000);

    await waitFor(() => expect(within(row).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument());
    expect(within(row).getByText('Ya pasó')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: CHIP })).toBeEnabled();
  });
});

describe('MyAppointmentsPage: el aviso de turno pedido', () => {
  async function request() {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    openMyAppointments({ appointments: [appt({ id: 'p-2', scheduled_at: '2026-11-10T21:00:00.000Z' })] });
    await user.click(await screen.findByRole('button', { name: CHIP }));
    const dialog = await screen.findByRole('dialog', { name: 'Pedir turno' });
    await user.click(within(dialog).getByRole('button', { name: 'Pedir turno' }));
    expect(await screen.findByText(NOTICE)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    return user;
  }

  it('se va al abrir otro diálogo (cancelar otro turno)', async () => {
    const user = await request();
    const row = await rowOf('Martes 10/11 · 18:00');
    await user.click(within(row).getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByRole('dialog', { name: 'Cancelar turno' })).toBeInTheDocument();
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });

  it(`se va solo a los ${NOTICE_MS / 1000} s`, async () => {
    await request();
    await jump(NOTICE_MS);
    await waitFor(() => expect(screen.queryByText(NOTICE)).not.toBeInTheDocument());
  });
});
