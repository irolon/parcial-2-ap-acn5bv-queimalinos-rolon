import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FREE, NOW, appt, openMyAppointments, requests } from '../../../helpers/agenda/student';
import { cleanUpStudent, signInStudent } from '../../../helpers/student/today';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

// Hoy es miércoles 04/11 a las 12:00 en Argentina.
beforeEach(() => signInStudent(new Date(NOW)));
afterEach(cleanUpStudent);

const LIMIT = 'Ya tenés 3 turnos pendientes: esperá a que tu entrenador los confirme.';
const chip = (name = 'Pedir turno el viernes 06/11 a las 18:00') => screen.findByRole('button', { name });
const pending = (day) => appt({ id: `p-${day}`, scheduled_at: `2026-11-${day}T21:00:00.000Z` });

describe('MyAppointmentsPage: los horarios libres', () => {
  it('pide los libres de hoy a hoy + 27 y los agrupa por día con chips de hora', async () => {
    const { fetchMock } = openMyAppointments({ free: FREE });
    const button = await chip();
    expect(button).toHaveTextContent('18:00');
    expect(button).toHaveClass('min-h-11');
    expect(screen.getByText('VIE 06/11')).toBeInTheDocument();
    expect(screen.getByText('LUN 09/11')).toBeInTheDocument();
    expect(await chip('Pedir turno el lunes 09/11 a las 09:00')).toHaveTextContent('09:00');
    expect(screen.getByText('Podés tener hasta 3 turnos pendientes.')).toBeInTheDocument();
    expect(requests(fetchMock, 'GET', '/availability/free?')[0][0]).toMatch(
      /\/availability\/free\?from=2026-11-04&to=2026-12-01$/,
    );
  });

  it('sin libres lo dice', async () => {
    openMyAppointments({ free: [] });
    expect(
      await screen.findByText('Tu entrenador no tiene horarios libres en las próximas 4 semanas.'),
    ).toBeInTheDocument();
  });

  it('mientras cargan lo anuncia', async () => {
    openMyAppointments({ free: () => new Promise(() => {}) });
    expect(await screen.findByText('Cargando los horarios libres…')).toBeInTheDocument();
  });

  it('si fallan lo dice con su propio Reintentar', async () => {
    let attempts = 0;
    openMyAppointments({ appointments: [appt()], free: () => (attempts++ === 0 ? 500 : FREE) });
    const alert = (await screen.findByText('No pudimos cargar los horarios libres.')).closest('[role="alert"]');
    expect(await screen.findByText('Viernes 06/11 · 18:00')).toBeInTheDocument();
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await chip()).toBeEnabled();
  });

  it('con 3 pendientes a futuro los chips quedan deshabilitados con el motivo', async () => {
    openMyAppointments({ appointments: [pending('05'), pending('06'), pending('10')] });
    await screen.findByText('Jueves 05/11 · 18:00');
    const button = await chip('Pedir turno el lunes 09/11 a las 09:00');
    expect(button).toBeDisabled();
    expect(screen.getByText(LIMIT)).toBeInTheDocument();
    expect(button).toHaveAccessibleDescription(LIMIT);
  });

  it('con 2 pendientes y un cancelado los chips siguen habilitados', async () => {
    openMyAppointments({
      appointments: [pending('05'), pending('10'), appt({ id: 'x', status: 'cancelled' })],
    });
    await screen.findByText('Jueves 05/11 · 18:00');
    expect(await chip()).toBeEnabled();
    expect(screen.queryByText(LIMIT)).not.toBeInTheDocument();
  });
});
