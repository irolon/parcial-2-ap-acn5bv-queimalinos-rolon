import { afterEach, describe, expect, it } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls } from '../../../helpers/shared/fetchMock';
import { stubUpload } from '../../../helpers/workout/activeWorkout';
import { TODAY_URL } from '../../../helpers/workout/router';
import { finishedWorkout } from '../../../helpers/workout/workout';
import { STUDENT_ID, cleanUpBrowser, renderWorkoutPage } from '../../../helpers/workout/workoutPage';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

afterEach(cleanUpBrowser);

const KEY = `ft.workout.${STUDENT_ID}`;
// Lo que hace otra pestaña: cambia localStorage y esta se entera por el evento `storage`.
const fromOtherTab = (write) => act(() => {
  write();
  window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
});

describe('WorkoutPage: con la sesión abierta en otra pestaña', () => {
  it('si la otra la termina y la sube, esta avisa que se guarda allá (no un error) y no la sube de nuevo', async () => {
    const fetchMock = stubUpload();
    const { pathname } = renderWorkoutPage();
    expect(await screen.findByRole('button', { name: 'Registrar serie' })).toBeInTheDocument();
    const ready = finishedWorkout(2, { feedback: { rpe: null, notes: null } });
    fromOtherTab(() => localStorage.setItem(KEY, JSON.stringify(ready)));
    expect(screen.getByRole('status')).toHaveTextContent('Se está guardando en otra pestaña.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(calls(fetchMock)).toHaveLength(0);
    // La otra terminó de subirla y borró la copia: esta vuelve a Hoy (el resumen lo muestra la otra, ver spec §8).
    fromOtherTab(() => localStorage.removeItem(KEY));
    expect(await screen.findByText('Pantalla de Hoy')).toBeInTheDocument();
    expect(pathname()).toBe(TODAY_URL);
  });

  it('si la otra falló o se cerró, "Guardar desde acá" la sube desde esta pestaña', async () => {
    const fetchMock = stubUpload();
    renderWorkoutPage();
    expect(await screen.findByRole('button', { name: 'Registrar serie' })).toBeInTheDocument();
    const ready = finishedWorkout(2, { feedback: { rpe: null, notes: null } });
    fromOtherTab(() => localStorage.setItem(KEY, JSON.stringify(ready)));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar desde acá' }));
    expect(await screen.findByRole('heading', { name: '¡Entrenamiento guardado!' })).toBeInTheDocument();
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/sessions', '/sessions/session-1/sets']);
  });
});
