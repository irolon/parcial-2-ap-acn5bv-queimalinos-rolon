import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TODAY_URL, WORKOUT_URL } from '../../../helpers/workout/router';
import { freshWorkout, withSets } from '../../../helpers/workout/workout';
import {
  cleanUpBrowser, finishButton, renderWorkoutPage, stored,
} from '../../../helpers/workout/workoutPage';

afterEach(cleanUpBrowser);

// El plan son 7 series: 4 de Press banca y 3 de Remo con barra.
const ALL_SETS = [[0, 60, 10], [0, 60, 10], [0, 60, 10], [0, 60, 10], [1, 40, 12], [1, 40, 12], [1, 40, 12]];
const withOneSet = () => withSets(freshWorkout(), [[0, 62.5, 10]]);
const feedbackTitle = () => screen.findByRole('heading', { name: '¿Qué tan dura fue?' });

describe('WorkoutPage: Terminar con series faltantes', () => {
  it('pregunta "Te faltan N series, ¿terminar igual?" y todavía no termina nada', async () => {
    renderWorkoutPage({ workout: withOneSet() });
    await userEvent.setup().click(finishButton());
    expect(screen.getByRole('dialog', { name: 'Te faltan 6 series, ¿terminar igual?' })).toBeInTheDocument();
    expect(stored().finishedAt).toBeNull();
  });

  it('"Seguir entrenando" cierra el diálogo y deja todo como estaba', async () => {
    renderWorkoutPage({ workout: withOneSet() });
    const user = userEvent.setup();
    await user.click(finishButton());
    await user.click(screen.getByRole('button', { name: 'Seguir entrenando' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Press banca' })).toBeInTheDocument();
    expect(stored().finishedAt).toBeNull();
  });

  it('"Terminar igual" fija la hora de fin y pasa a "¿Qué tan dura fue?"', async () => {
    renderWorkoutPage({ workout: withOneSet() });
    const user = userEvent.setup();
    await user.click(finishButton());
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Terminar igual' }));
    expect(await feedbackTitle()).toBeInTheDocument();
    expect(stored().finishedAt).not.toBeNull();
    expect(stored().feedback).toBeNull();
    expect(screen.queryByRole('button', { name: 'Registrar serie' })).not.toBeInTheDocument();
  });

  it('con una sola serie faltante concuerda en singular', async () => {
    renderWorkoutPage({ workout: withSets(freshWorkout(), ALL_SETS.slice(0, 6)) });
    await userEvent.setup().click(finishButton());
    expect(screen.getByRole('dialog', { name: 'Te falta 1 serie, ¿terminar igual?' })).toBeInTheDocument();
  });

  it('terminar corta el descanso que estaba corriendo', async () => {
    renderWorkoutPage({ workout: withOneSet() });
    const user = userEvent.setup();
    await user.click(finishButton());
    await user.click(screen.getByRole('button', { name: 'Terminar igual' }));
    await feedbackTitle();
    expect(stored().restEndsAt).toBeNull();
  });
});

describe('WorkoutPage: Terminar con todo hecho', () => {
  it('termina sin preguntar', async () => {
    renderWorkoutPage({ workout: withSets(freshWorkout(), ALL_SETS) });
    await userEvent.setup().click(finishButton());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await feedbackTitle()).toBeInTheDocument();
    expect(stored().finishedAt).not.toBeNull();
  });
});

describe('WorkoutPage: Terminar sin ninguna serie', () => {
  it('pregunta "No registraste ninguna serie. ¿Descartar el entrenamiento?"', async () => {
    renderWorkoutPage();
    await userEvent.setup().click(finishButton());
    const dialog = screen.getByRole('dialog', { name: 'No registraste ninguna serie. ¿Descartar el entrenamiento?' });
    expect(within(dialog).queryByRole('button', { name: 'Terminar igual' })).not.toBeInTheDocument();
  });

  it('"Seguir entrenando" vuelve a la sesión', async () => {
    const { pathname } = renderWorkoutPage();
    const user = userEvent.setup();
    await user.click(finishButton());
    await user.click(screen.getByRole('button', { name: 'Seguir entrenando' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(pathname()).toBe(WORKOUT_URL);
    expect(stored()).not.toBeNull();
  });

  it('"Descartar" borra la sesión del navegador y vuelve a Hoy', async () => {
    const { pathname } = renderWorkoutPage();
    const user = userEvent.setup();
    await user.click(finishButton());
    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(await screen.findByText('Pantalla de Hoy')).toBeInTheDocument();
    expect(pathname()).toBe(TODAY_URL);
    expect(stored()).toBeNull();
  });
});
