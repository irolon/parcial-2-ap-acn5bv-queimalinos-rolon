import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { bodyOf, calls, jsonResponse } from '../../../helpers/shared/fetchMock';
import { stubUpload } from '../../../helpers/workout/activeWorkout';
import { at, isoAt } from '../../../helpers/workout/workout';
import {
  cleanUpBrowser, finishButton, registerButton, renderWorkoutPage, stored,
} from '../../../helpers/workout/workoutPage';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

// La sesión empezó en T0; el alumno registra a los 30 minutos y termina un minuto después (solo se congela la fecha:
// los timers son de verdad).
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(at(30 * 60));
});
afterEach(cleanUpBrowser);

const FIRST = { code: 'FIRST_SESSION', name: 'Primera sesión', category: 'milestone' };
const PR = { code: 'FIRST_PR', name: 'Primer récord', category: 'pr' };

describe('WorkoutPage: una sesión de punta a punta', () => {
  it('registra, descansa, termina con series faltantes, saltea el feedback y ve el resumen con sus logros', async () => {
    const fetchMock = stubUpload({
      session: [(path, body) => jsonResponse(201, { data: { ...body, student_id: 's-1', unlocked_achievements: [FIRST] } })],
      sets: [(path, body) => jsonResponse(200, {
        data: { saved: body.sets.map(({ id }) => ({ id, created: true })), failed: [], unlocked_achievements: [PR] },
      })],
    });
    const { pathname } = renderWorkoutPage();
    const user = userEvent.setup();

    // Dos series de Press banca, la primera con +2,5 kg; después de registrar arranca el descanso.
    await user.click(screen.getByRole('button', { name: '+2,5 kg' }));
    await user.click(registerButton());
    expect(screen.getByRole('timer')).toHaveTextContent('1:30');
    vi.setSystemTime(at(31 * 60));
    await user.click(registerButton());
    await user.click(screen.getByRole('button', { name: 'Saltar descanso' }));
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(stored().sets).toHaveLength(2);

    // Terminar: faltan 5 de las 7 series del plan.
    await user.click(finishButton());
    const dialog = screen.getByRole('dialog', { name: 'Te faltan 5 series, ¿terminar igual?' });
    await user.click(within(dialog).getByRole('button', { name: 'Terminar igual' }));

    // Feedback: Saltar sube la sesión.
    expect(await screen.findByRole('heading', { name: '¿Qué tan dura fue?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Saltar' }));

    // Resumen: en la misma página, sin pasar por Hoy, con los logros y la sesión ya borrada del navegador.
    expect(await screen.findByRole('heading', { name: '¡Entrenamiento guardado!' })).toBeInTheDocument();
    expect(screen.getByText('2 series · 1300 kg · 31 min')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Logros desbloqueados' });
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Primera sesión',
      'Primer récord',
    ]);
    expect(pathname()).toBe('/alumno/entrenar');
    expect(stored()).toBeNull();

    // Lo que viajó: la sesión con su hora de fin (sin RPE ni nota) y las dos series, con los ids del cliente.
    const [[sessionPath, sessionInit], [setsPath, setsInit]] = calls(fetchMock);
    expect(sessionPath).toBe('/sessions');
    expect(bodyOf(sessionInit)).toEqual({
      id: expect.any(String), routine_id: 'r-1', started_at: isoAt(0), finished_at: isoAt(31 * 60),
    });
    expect(setsPath).toBe(`/sessions/${bodyOf(sessionInit).id}/sets`);
    expect(bodyOf(setsInit).sets).toMatchObject([
      { exercise_id: 'e-1', routine_exercise_id: 're-1', set_number: 1, actual_reps: 10, actual_kg: 65 },
      { exercise_id: 'e-1', routine_exercise_id: 're-1', set_number: 2, actual_reps: 10, actual_kg: 65 },
    ]);
  });
});
