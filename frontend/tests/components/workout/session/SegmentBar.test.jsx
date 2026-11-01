import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SegmentBar from '@/components/workout/session/SegmentBar';
import { setCursor } from '@/utils/workout/workoutState';
import { freshWorkout, withSets } from '../../../helpers/workout/workout';

const segment = (name) => screen.getByRole('button', { name });

describe('SegmentBar', () => {
  it('es un segmento por ejercicio, con el nombre del ejercicio', () => {
    render(<SegmentBar workout={freshWorkout()} onSelect={vi.fn()} />);
    expect(screen.getByRole('list', { name: 'Ejercicios de la sesión' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(segment('Ejercicio 1: Press banca')).toBeInTheDocument();
    expect(segment('Ejercicio 2: Remo con barra')).toBeInTheDocument();
  });

  it('marca el ejercicio a la vista', () => {
    render(<SegmentBar workout={setCursor(freshWorkout(), 1)} onSelect={vi.fn()} />);
    expect(segment('Ejercicio 2: Remo con barra')).toHaveAttribute('aria-current', 'step');
    expect(segment('Ejercicio 1: Press banca')).not.toHaveAttribute('aria-current');
  });

  it('un ejercicio con todas sus series es "done" y el que se está viendo es "current"', () => {
    const rows = [[0, 60, 10], [0, 60, 10], [0, 60, 10], [0, 60, 10], [1, 40, 12]];
    render(<SegmentBar workout={withSets(freshWorkout(), rows)} onSelect={vi.fn()} />);
    // Press banca: 4 de 4. El cursor quedó en Remo (1 de 3), que está a la vista.
    expect(segment('Ejercicio 1: Press banca')).toHaveAttribute('data-state', 'done');
    expect(segment('Ejercicio 2: Remo con barra')).toHaveAttribute('data-state', 'current');
  });

  it('uno con algunas series es "partial"', () => {
    const state = setCursor(withSets(freshWorkout(), [[0, 60, 10]]), 1);
    render(<SegmentBar workout={state} onSelect={vi.fn()} />);
    expect(segment('Ejercicio 1: Press banca')).toHaveAttribute('data-state', 'partial');
  });

  it('uno sin ninguna es "todo"', () => {
    render(<SegmentBar workout={freshWorkout()} onSelect={vi.fn()} />);
    expect(segment('Ejercicio 1: Press banca')).toHaveAttribute('data-state', 'current');
    expect(segment('Ejercicio 2: Remo con barra')).toHaveAttribute('data-state', 'todo');
  });

  it('tocar un segmento salta a ese ejercicio', async () => {
    const onSelect = vi.fn();
    render(<SegmentBar workout={freshWorkout()} onSelect={onSelect} />);
    await userEvent.setup().click(segment('Ejercicio 2: Remo con barra'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
