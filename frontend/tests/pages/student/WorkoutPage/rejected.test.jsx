import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, errorResponse } from '../../../helpers/shared/fetchMock';
import { stubUpload } from '../../../helpers/workout/activeWorkout';
import { TODAY_URL, WORKOUT_URL } from '../../../helpers/workout/router';
import { finishedWorkout } from '../../../helpers/workout/workout';
import { cleanUpBrowser, renderWorkoutPage, stored } from '../../../helpers/workout/workoutPage';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

afterEach(cleanUpBrowser);

// Una subida que el servidor rechaza para siempre (409, 403, 400…): reintentar daría lo mismo.
const CONFLICT = () => errorResponse(409, 'SESSION_ID_CONFLICT', 'Esa sesión ya existe y es de otro alumno');
const readyToUpload = () => finishedWorkout(2, { feedback: { rpe: null, notes: null } });
const discardButton = () => screen.findByRole('button', { name: 'Descartar entrenamiento' });

describe('WorkoutPage: una subida que el servidor rechaza para siempre', () => {
  it('muestra el mensaje del servidor y que no se pudo guardar, sin Reintentar', async () => {
    stubUpload({ session: [CONFLICT] });
    renderWorkoutPage({ workout: readyToUpload() });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Esa sesión ya existe y es de otro alumno');
    expect(alert).toHaveTextContent('No se pudo guardar este entrenamiento.');
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(stored()).not.toBeNull();
  });

  it('también cuando lo rechaza un lote de series (la sesión ya estaba creada)', async () => {
    stubUpload({ sets: [() => errorResponse(400, 'VALIDATION_ERROR', 'Las series no son válidas')] });
    renderWorkoutPage({ workout: readyToUpload() });
    expect(await screen.findByRole('alert')).toHaveTextContent('Las series no son válidas');
    expect(await discardButton()).toBeEnabled();
  });

  it('Descartar entrenamiento pide confirmar y Cancelar deja todo como estaba', async () => {
    stubUpload({ session: [CONFLICT] });
    const { pathname } = renderWorkoutPage({ workout: readyToUpload() });
    const user = userEvent.setup();
    await user.click(await discardButton());
    const dialog = screen.getByRole('dialog', { name: '¿Descartar el entrenamiento? No se va a guardar.' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar este entrenamiento.');
    expect(pathname()).toBe(WORKOUT_URL);
    expect(stored()).not.toBeNull();
  });

  it('confirmar borra la sesión del navegador y vuelve a Hoy', async () => {
    const fetchMock = stubUpload({ session: [CONFLICT] });
    const { pathname, router } = renderWorkoutPage({ workout: readyToUpload() });
    const user = userEvent.setup();
    await user.click(await discardButton());
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Descartar' }));
    expect(await screen.findByText('Pantalla de Hoy')).toBeInTheDocument();
    expect(pathname()).toBe(TODAY_URL);
    expect(router.state.historyAction).toBe('REPLACE');
    expect(stored()).toBeNull();
    expect(calls(fetchMock)).toHaveLength(1); // solo el POST que rechazaron: descartar no manda nada más
  });
});

describe('WorkoutPage: una subida que se puede reintentar', () => {
  it('ofrece Reintentar y, con confirmación, Descartar: borra la sesión del navegador y vuelve a Hoy', async () => {
    const fetchMock = stubUpload({ sets: [503] });
    const { pathname } = renderWorkoutPage({ workout: readyToUpload() });
    const user = userEvent.setup();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    const sent = calls(fetchMock).length;
    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Descartar' }));
    expect(await screen.findByText('Pantalla de Hoy')).toBeInTheDocument();
    expect(pathname()).toBe(TODAY_URL);
    expect(stored()).toBeNull();
    expect(calls(fetchMock)).toHaveLength(sent); // descartar no manda nada más
  });
});
