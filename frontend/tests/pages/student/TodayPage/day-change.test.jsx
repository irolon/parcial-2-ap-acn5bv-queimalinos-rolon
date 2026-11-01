import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { calls } from '../../../helpers/shared/fetchMock';
import { mineRoutine, todayRoutine } from '../../../helpers/routines/studentRoutines';
import { cleanUpStudent, openStudent, signInStudent } from '../../../helpers/student/today';

// Argentina es UTC-3: las 23:59 del domingo 1/11 son las 02:59 UTC del lunes 2/11.
const SUNDAY_2359 = new Date('2026-11-02T02:59:00Z');
const MONDAY_1000 = new Date('2026-11-02T13:00:00Z');

beforeEach(() => signInStudent(SUNDAY_2359));
afterEach(cleanUpStudent);

describe('TodayPage: la pestaña queda abierta de un día para otro', () => {
  it('al volver a la pestaña cambia la fecha, la semana y la rutina del día, y no se queda con la de ayer', async () => {
    let routine = todayRoutine({ name: 'Rutina del domingo' });
    const { fetchMock } = openStudent('/alumno/hoy', { today: () => routine, mine: [mineRoutine({ days: ['sunday', 'monday'] })] });
    expect(await screen.findByRole('heading', { level: 2, name: 'Rutina del domingo' })).toBeInTheDocument();
    expect(screen.getByText('Domingo 1 de noviembre')).toBeInTheDocument();
    expect(screen.getByText('Hoy · Domingo')).toBeInTheDocument();
    expect(await screen.findByLabelText('Domingo: día de entrenamiento, hoy')).toBeInTheDocument();

    routine = todayRoutine({ name: 'Rutina del lunes' });
    vi.setSystemTime(MONDAY_1000);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
    });

    expect(await screen.findByRole('heading', { level: 2, name: 'Rutina del lunes' })).toBeInTheDocument();
    expect(screen.queryByText('Rutina del domingo')).not.toBeInTheDocument();
    expect(screen.getByText('Lunes 2 de noviembre')).toBeInTheDocument();
    expect(screen.getByText('Hoy · Lunes')).toBeInTheDocument();
    expect(await screen.findByLabelText('Lunes: día de entrenamiento, hoy')).toBeInTheDocument();
    expect(calls(fetchMock).filter(([path]) => path === '/routines/today').length).toBeGreaterThanOrEqual(2);
  });
});
