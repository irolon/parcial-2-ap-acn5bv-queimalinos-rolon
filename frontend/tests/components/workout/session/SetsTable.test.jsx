import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetsTable from '@/components/workout/session/SetsTable';
import { setCursor } from '@/utils/workout/workoutState';
import { freshWorkout, withSets } from '../../../helpers/workout/workout';

const rowsOf = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
// Número, peso y reps de la fila (la última celda es la ✕).
const cells = (row) => within(row).getAllByRole('cell').slice(0, 3).map((cell) => cell.textContent);

describe('SetsTable', () => {
  it('es una tabla "Series" con encabezados #, Peso y Reps', () => {
    render(<SetsTable workout={withSets(freshWorkout(), [[0, 62.5, 10]])} onDelete={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Series' })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Series' });
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      '#', 'Peso', 'Reps', 'Borrar',
    ]);
  });

  it('lista las series del ejercicio a la vista, en orden, con peso y reps', () => {
    const state = withSets(freshWorkout(), [[0, 62.5, 10], [0, null, 12], [1, 40, 8]]);
    render(<SetsTable workout={setCursor(state, 0)} onDelete={vi.fn()} />);
    expect(rowsOf().map(cells)).toEqual([
      ['1', '62,5 kg', '10'],
      ['2', 'Peso corporal', '12'],
    ]);
  });

  it('muestra solo las del ejercicio a la vista', () => {
    const state = withSets(freshWorkout(), [[0, 62.5, 10], [1, 40, 8]]);
    render(<SetsTable workout={setCursor(state, 1)} onDelete={vi.fn()} />);
    expect(rowsOf().map(cells)).toEqual([['1', '40 kg', '8']]);
  });

  it('sin series dice que todavía no hay ninguna', () => {
    render(<SetsTable workout={freshWorkout()} onDelete={vi.fn()} />);
    expect(rowsOf()).toHaveLength(0);
    expect(screen.getByText('Todavía no registraste series de este ejercicio.')).toBeInTheDocument();
  });

  it('la ✕ de cada fila pide borrar esa serie', async () => {
    const onDelete = vi.fn();
    const state = withSets(freshWorkout(), [[0, 62.5, 10], [0, 65, 8]]);
    render(<SetsTable workout={state} onDelete={onDelete} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Borrar la serie 2' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0][0]).toMatchObject({ setNumber: 2, kg: 65, reps: 8 });
  });

  it('muestra, apagadas y fuera del lector de pantalla, las series que faltan del plan', () => {
    const { container } = render(<SetsTable workout={withSets(freshWorkout(), [[0, 62.5, 10]])} onDelete={vi.fn()} />);
    // Plan de 4 series, 1 hecha: las filas 2 (la que sigue), 3 y 4 son marcadores.
    expect(container.querySelectorAll('tr[aria-hidden="true"]')).toHaveLength(3);
    expect(rowsOf()).toHaveLength(1);
  });
});
