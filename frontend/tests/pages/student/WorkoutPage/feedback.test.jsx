import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { bodyOf, calls } from '../../../helpers/shared/fetchMock';
import { heldResponse, stubUpload } from '../../../helpers/workout/activeWorkout';
import { finishedWorkout } from '../../../helpers/workout/workout';
import { cleanUpBrowser, renderWorkoutPage, stored } from '../../../helpers/workout/workoutPage';

afterEach(cleanUpBrowser);

// Sesión terminada (Press banca, 2 series) a la que todavía no se le pidió el feedback.
const askingFeedback = () => renderWorkoutPage({ workout: finishedWorkout(2) });
const summary = () => screen.findByRole('heading', { name: '¡Entrenamiento guardado!' });
const sessionBody = (fetchMock) => bodyOf(calls(fetchMock).find(([path]) => path === '/sessions')[1]);

describe('WorkoutPage: el feedback', () => {
  it('con la sesión terminada y sin feedback, lo pide (también al recargar)', () => {
    askingFeedback();
    expect(screen.getByRole('heading', { name: '¿Qué tan dura fue?' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: '¿Qué tan dura fue?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nota (opcional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Registrar serie' })).not.toBeInTheDocument();
  });

  it('Saltar guarda la sesión sin RPE ni nota', async () => {
    const fetchMock = stubUpload();
    askingFeedback();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Saltar' }));
    await summary();
    expect(Object.keys(sessionBody(fetchMock))).toEqual(['id', 'routine_id', 'started_at', 'finished_at']);
  });

  it('Guardar manda el RPE y la nota en el POST de la sesión', async () => {
    const fetchMock = stubUpload();
    askingFeedback();
    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: 'RPE 8' }));
    await user.type(screen.getByLabelText('Nota (opcional)'), 'Me sentí fuerte');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await summary();
    expect(sessionBody(fetchMock)).toMatchObject({ rpe: 8, notes: 'Me sentí fuerte' });
  });

  it('el feedback queda decidido en lo guardado: al recargar a mitad de la subida no se vuelve a pedir', async () => {
    const held = heldResponse();
    stubUpload({ session: [held.respond] });
    askingFeedback();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Saltar' }));
    expect(stored().feedback).toEqual({ rpe: null, notes: null });
    held.release();
    await summary();
  });

  it('mientras sube dice "Guardando tu entrenamiento…" y no ofrece Descartar', async () => {
    const held = heldResponse();
    stubUpload({ session: [held.respond] });
    askingFeedback();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Saltar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Guardando tu entrenamiento…');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    held.release();
    await summary();
    expect(screen.queryByText('Guardando tu entrenamiento…')).not.toBeInTheDocument();
  });
});
