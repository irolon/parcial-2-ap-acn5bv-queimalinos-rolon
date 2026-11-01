import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { STUDENT } from '../../../helpers/routes/renderRoute';
import { calls } from '../../../helpers/shared/fetchMock';
import { mineRoutine, todayRoutine } from '../../../helpers/routines/studentRoutines';
import { streakData } from '../../../helpers/student/home';
import { cleanUpStudent, openStudent, signInStudent } from '../../../helpers/student/today';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

// Argentina es UTC-3: las 23:59 del domingo 1/11 son las 02:59 UTC del lunes 2/11.
const SUNDAY_2359 = new Date('2026-11-02T02:59:00Z');
const MONDAY_1000 = new Date('2026-11-02T13:00:00Z');

beforeEach(() => signInStudent(SUNDAY_2359));
afterEach(cleanUpStudent);

const requests = (fetchMock, path) => calls(fetchMock).filter(([called]) => called === path).length;

describe('TodayPage: la pestaña queda abierta de un día para otro', () => {
  it('al volver a la pestaña cambia la fecha, la semana y la rutina del día, y no se queda con la de ayer', async () => {
    let routine = todayRoutine({ name: 'Rutina del domingo' });
    const { fetchMock } = openStudent('/alumno/hoy', { today: () => routine, mine: [mineRoutine({ days: ['sunday', 'monday'] })] });
    expect(await screen.findByRole('heading', { level: 2, name: 'Rutina del domingo' })).toBeInTheDocument();
    expect(screen.getByText('Domingo 1 de noviembre')).toBeInTheDocument();
    expect(screen.getByText('Hoy · Domingo')).toBeInTheDocument();
    expect(await screen.findByText('Domingo: día de entrenamiento, hoy')).toBeInTheDocument();

    routine = todayRoutine({ name: 'Rutina del lunes' });
    vi.setSystemTime(MONDAY_1000);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
    });

    expect(await screen.findByRole('heading', { level: 2, name: 'Rutina del lunes' })).toBeInTheDocument();
    expect(screen.queryByText('Rutina del domingo')).not.toBeInTheDocument();
    expect(screen.getByText('Lunes 2 de noviembre')).toBeInTheDocument();
    expect(screen.getByText('Hoy · Lunes')).toBeInTheDocument();
    expect(await screen.findByText('Lunes: día de entrenamiento, hoy')).toBeInTheDocument();
    expect(requests(fetchMock, '/routines/today')).toBeGreaterThanOrEqual(2);
  });

  // Un solo reloj: la fecha que se ve y la de la consulta de la rutina del día son la misma.
  it('la rutina del día sigue la fecha de la pantalla, no el reloj de la máquina', async () => {
    const { fetchMock } = openStudent('/alumno/hoy', { today: todayRoutine(), mine: [mineRoutine()] });
    await screen.findByRole('heading', { level: 2, name: 'Push · día 3' });
    expect(requests(fetchMock, '/routines/today')).toBe(1);

    // El reloj ya marca el lunes, pero nada revisó el día todavía; la pantalla se vuelve a renderizar por otro motivo.
    vi.setSystemTime(MONDAY_1000);
    act(() => useAuthStore.setState({ user: { ...STUDENT } }));
    await act(() => Promise.resolve());

    expect(screen.getByText('Domingo 1 de noviembre')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Push · día 3' })).toBeInTheDocument();
    expect(requests(fetchMock, '/routines/today')).toBe(1);
  });

  // `visibilitychange` sin burbujear hasta `window`: así el refresco por foco de la librería no tapa lo que se prueba.
  it('al cambiar el día vuelve a pedir la racha: si no entrenó ayer, se cortó', async () => {
    let streak = streakData(12);
    const { fetchMock } = openStudent('/alumno/hoy', { today: todayRoutine(), mine: [mineRoutine()], streak: () => streak });
    expect(await screen.findByText('Racha 12 días')).toBeInTheDocument();
    expect(requests(fetchMock, '/students/s-1/streak')).toBe(1);

    streak = streakData(0, 12);
    vi.setSystemTime(new Date('2026-11-02T02:59:30Z')); // sigue siendo domingo en Argentina
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(() => Promise.resolve());
    expect(requests(fetchMock, '/students/s-1/streak')).toBe(1);
    expect(screen.getByText('Racha 12 días')).toBeInTheDocument();

    vi.setSystemTime(MONDAY_1000);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(screen.queryByText(/Racha/)).not.toBeInTheDocument());
    expect(requests(fetchMock, '/students/s-1/streak')).toBe(2);
  });
});
