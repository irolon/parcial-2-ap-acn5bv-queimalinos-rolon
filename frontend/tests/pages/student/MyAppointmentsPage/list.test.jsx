import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NOW, appt, openMyAppointments, requests } from '../../../helpers/agenda/student';
import { cleanUpStudent, signInStudent } from '../../../helpers/student/today';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

// Hoy es miércoles 04/11 a las 12:00 en Argentina.
beforeEach(() => signInStudent(new Date(NOW)));
afterEach(cleanUpStudent);

const list = async () => within(await screen.findByRole('list', { name: 'Tus turnos' }));
const rowOf = async (text) => (await screen.findByText(text)).closest('li');

describe('MyAppointmentsPage: la lista', () => {
  it('pide los turnos de hoy a hoy + 59 y muestra fecha, estado y nota con su botón Cancelar', async () => {
    const { fetchMock } = openMyAppointments({ appointments: [appt({ notes: 'Traigo la banda elástica' })] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Mis turnos' })).toBeVisible();
    const row = await rowOf('Viernes 06/11 · 18:00');
    expect(within(row).getByText('Pendiente')).toBeInTheDocument();
    expect(within(row).getByText('Traigo la banda elástica')).toHaveClass('text-ink6', 'line-clamp-2');
    expect(within(row).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(requests(fetchMock, 'GET', '/appointments?')[0][0]).toMatch(/\/appointments\?from=2026-11-04&to=2027-01-02$/);
  });

  it('los cancelados van al final, atenuados y sin botón', async () => {
    openMyAppointments({
      appointments: [
        appt({ id: 'x', status: 'cancelled', scheduled_at: '2026-11-05T21:00:00.000Z' }),
        appt({ id: 'c', status: 'confirmed', scheduled_at: '2026-11-10T21:00:00.000Z' }),
        appt({ id: 'p' }),
      ],
    });
    const items = (await list()).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining('Viernes 06/11 · 18:00'),
      expect.stringContaining('Martes 10/11 · 18:00'),
      expect.stringContaining('Jueves 05/11 · 18:00'),
    ]);
    expect(items[2]).toHaveClass('opacity-60');
    expect(within(items[2]).getByText('Cancelado')).toBeInTheDocument();
    expect(within(items[2]).queryByRole('button')).not.toBeInTheDocument();
    expect(items[1]).not.toHaveClass('opacity-60');
  });

  it('un turno de hoy que ya pasó dice "Ya pasó" en lugar de Cancelar', async () => {
    openMyAppointments({ appointments: [appt({ status: 'confirmed', scheduled_at: '2026-11-04T13:00:00.000Z' })] });
    const row = await rowOf('Miércoles 04/11 · 10:00');
    expect(within(row).getByText('Ya pasó')).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
  });

  it('sin turnos muestra el vacío', async () => {
    openMyAppointments({ appointments: [] });
    expect(await screen.findByText('No tenés turnos. Pedí uno con tu entrenador.')).toBeInTheDocument();
  });

  it('mientras carga lo anuncia', async () => {
    openMyAppointments({ appointments: () => new Promise(() => {}) });
    expect(await screen.findByText('Cargando tus turnos…')).toBeInTheDocument();
  });

  it('si fallan los turnos lo dice y Reintentar los trae', async () => {
    let attempts = 0;
    openMyAppointments({ appointments: () => (attempts++ === 0 ? 500 : [appt()]) });
    const alert = (await screen.findByText('No pudimos cargar tus turnos.')).closest('[role="alert"]');
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Viernes 06/11 · 18:00')).toBeInTheDocument();
  });
});
