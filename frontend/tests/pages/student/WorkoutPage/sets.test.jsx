import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { freshWorkout, withSets } from '../../../helpers/workout/workout';
import {
  cleanUpBrowser, reloadWorkoutPage, renderWorkoutPage, stored,
} from '../../../helpers/workout/workoutPage';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

afterEach(cleanUpBrowser);

const seriesTable = () => screen.getByRole('table', { name: 'Series' });
const rows = () => within(seriesTable()).getAllByRole('row').slice(1);
const rowText = (row) => within(row).getAllByRole('cell').slice(0, 3).map((cell) => cell.textContent);

// Press banca: 62,5 kg × 10 y 65 kg × 8.
const withTwoSets = () => withSets(freshWorkout(), [[0, 62.5, 10], [0, 65, 8]]);

describe('WorkoutPage: borrar una serie', () => {
  it('la ✕ pide confirmación: "¿Borrar la serie N?"', async () => {
    renderWorkoutPage({ workout: withTwoSets() });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Borrar la serie 2' }));
    const dialog = screen.getByRole('dialog', { name: '¿Borrar la serie 2?' });
    expect(within(dialog).getByText('65 kg × 8 reps')).toBeInTheDocument();
    expect(stored().sets).toHaveLength(2); // todavía no se borró nada
  });

  it('Cancelar no borra nada', async () => {
    renderWorkoutPage({ workout: withTwoSets() });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Borrar la serie 1' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(rows().map(rowText)).toEqual([['1', '62,5 kg', '10'], ['2', '65 kg', '8']]);
    expect(stored().sets).toHaveLength(2);
  });

  it('Borrar la saca de la tabla y de lo guardado, y las que siguen se renumeran', async () => {
    renderWorkoutPage({ workout: withTwoSets() });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Borrar la serie 1' }));
    await user.click(screen.getByRole('button', { name: 'Borrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(rows().map(rowText)).toEqual([['1', '65 kg', '8']]);
    expect(stored().sets).toMatchObject([{ setNumber: 1, kg: 65, reps: 8 }]);
  });

  it('después de confirmar Borrar el foco va a Registrar serie (la ✕ que lo tenía ya no existe)', async () => {
    renderWorkoutPage({ workout: withTwoSets() });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Borrar la serie 1' }));
    await user.click(screen.getByRole('button', { name: 'Borrar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar serie' })).toHaveFocus());
  });

  it('con Cancelar o Esc el foco vuelve a la ✕ que abrió el diálogo, no a Registrar serie', async () => {
    renderWorkoutPage({ workout: withTwoSets() });
    const user = userEvent.setup();
    const cross = screen.getByRole('button', { name: 'Borrar la serie 1' });
    await user.click(cross);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(cross).toHaveFocus());
    await user.click(cross);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(cross).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Registrar serie' })).not.toHaveFocus();
  });

  it('después de borrar, los campos se precargan con la serie que quedó', async () => {
    renderWorkoutPage({ workout: withTwoSets() });
    const user = userEvent.setup();
    expect(screen.getByLabelText('Peso (kg)')).toHaveValue('65');
    await user.click(screen.getByRole('button', { name: 'Borrar la serie 2' }));
    await user.click(screen.getByRole('button', { name: 'Borrar' }));
    expect(screen.getByLabelText('Peso (kg)')).toHaveValue('62,5');
    expect(screen.getByText('SERIE 2 DE 4 · SUGERIDO 62,5 KG × 10')).toBeInTheDocument();
  });
});

describe('WorkoutPage: moverse entre ejercicios', () => {
  it('Siguiente y Anterior cambian el ejercicio y su tabla de series', async () => {
    renderWorkoutPage({ workout: withSets(freshWorkout(), [[0, 62.5, 10], [0, 65, 8], [1, 40, 12]]) });
    const user = userEvent.setup();
    expect(screen.getByRole('heading', { name: 'Remo con barra' })).toBeInTheDocument();
    expect(rows().map(rowText)).toEqual([['1', '40 kg', '12']]);

    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByRole('heading', { name: 'Press banca' })).toBeInTheDocument();
    expect(rows()).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(stored().cursor).toBe(0);
  });

  it('tocar un segmento salta a ese ejercicio y se guarda cuál quedó a la vista', async () => {
    renderWorkoutPage();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ejercicio 2: Remo con barra, sin empezar' }));
    expect(screen.getByRole('heading', { name: 'Remo con barra' })).toBeInTheDocument();
    expect(screen.getByText('EJERCICIO 2 DE 2', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(stored().cursor).toBe(1);
  });

  it('al recargar sigue en el mismo ejercicio', async () => {
    const first = renderWorkoutPage();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Siguiente' }));
    reloadWorkoutPage(first);
    expect(screen.getByRole('heading', { name: 'Remo con barra' })).toBeInTheDocument();
  });
});
