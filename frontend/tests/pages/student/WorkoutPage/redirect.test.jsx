import { afterEach, describe, expect, it } from 'vitest';
import { act, screen } from '@testing-library/react';
import { writeWorkout } from '@/hooks/workout/workoutStore';
import { TODAY_URL, WORKOUT_URL } from '../../../helpers/workout/router';
import { STUDENT_ID, cleanUpBrowser, renderWorkoutPage } from '../../../helpers/workout/workoutPage';

afterEach(cleanUpBrowser);

describe('WorkoutPage: sin sesión en curso', () => {
  it('redirige a Hoy, reemplazando la entrada del historial (atrás no vuelve a una pantalla vacía)', async () => {
    const { pathname, router } = renderWorkoutPage({ workout: null });
    expect(await screen.findByText('Pantalla de Hoy')).toBeInTheDocument();
    expect(pathname()).toBe(TODAY_URL);
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('no muestra la sesión ni parpadea con ella', () => {
    renderWorkoutPage({ workout: null });
    expect(screen.queryByRole('button', { name: 'Registrar serie' })).not.toBeInTheDocument();
  });

  it('si la descartan desde otra parte mientras está abierta, también vuelve a Hoy', async () => {
    const { pathname } = renderWorkoutPage();
    expect(pathname()).toBe(WORKOUT_URL);
    act(() => writeWorkout(STUDENT_ID, null));
    expect(await screen.findByText('Pantalla de Hoy')).toBeInTheDocument();
    expect(pathname()).toBe(TODAY_URL);
  });
});

describe('WorkoutPage: con una sesión en curso', () => {
  it('se queda y muestra la sesión', () => {
    const { pathname } = renderWorkoutPage();
    expect(pathname()).toBe(WORKOUT_URL);
    expect(screen.getByRole('heading', { name: 'Press banca' })).toBeInTheDocument();
    expect(screen.queryByText('Pantalla de Hoy')).not.toBeInTheDocument();
  });
});
