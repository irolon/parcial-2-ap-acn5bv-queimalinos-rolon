import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setCursor } from '@/utils/workout/workoutState';
import { PanelHarness, reps, weight } from '../../../../helpers/workout/exercisePanel';
import { freshWorkout } from '../../../../helpers/workout/workout';

const MINUS = '−';

describe('ExercisePanel: botones de paso', () => {
  it('el peso sube y baja de a 2,5 kg y el botón dice cuánto', async () => {
    render(<PanelHarness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '+2,5 kg' }));
    expect(weight()).toHaveValue('65');
    await user.click(screen.getByRole('button', { name: `${MINUS}2,5 kg` }));
    await user.click(screen.getByRole('button', { name: `${MINUS}2,5 kg` }));
    expect(weight()).toHaveValue('60');
  });

  it('el peso vuelve a "Peso corporal" al bajar de 2,5', async () => {
    render(<PanelHarness initial={setCursor(freshWorkout(), 1)} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '+2,5 kg' }));
    expect(weight()).toHaveValue('2,5');
    await user.click(screen.getByRole('button', { name: `${MINUS}2,5 kg` }));
    expect(weight()).toHaveValue('');
  });

  it('las reps suben y bajan de a una, sin pasar de 0', async () => {
    render(<PanelHarness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '+1 rep' }));
    expect(reps()).toHaveValue('11');
    await user.clear(reps());
    await user.type(reps(), '0');
    await user.click(screen.getByRole('button', { name: `${MINUS}1 rep` }));
    expect(reps()).toHaveValue('0');
  });
});

describe('ExercisePanel: escribir en los campos', () => {
  it('acepta coma o punto decimal y no deja escribir letras ni más de dos decimales', async () => {
    render(<PanelHarness />);
    const user = userEvent.setup();
    await user.clear(weight());
    await user.type(weight(), '72,5kg');
    expect(weight()).toHaveValue('72,5');
    await user.clear(weight());
    await user.type(weight(), '62.255');
    expect(weight()).toHaveValue('62.25');
  });

  it('las reps son un entero: no deja escribir coma ni letras', async () => {
    render(<PanelHarness />);
    const user = userEvent.setup();
    await user.clear(reps());
    await user.type(reps(), '8,5x');
    expect(reps()).toHaveValue('85');
  });

  it('al salir del campo deja el valor como lo guarda la sesión', async () => {
    render(<PanelHarness />);
    const user = userEvent.setup();
    await user.clear(weight());
    await user.type(weight(), '62,');
    await user.tab();
    expect(weight()).toHaveValue('62');
    await user.clear(reps());
    await user.type(reps(), '0010');
    await user.tab();
    expect(reps()).toHaveValue('10');
  });
});
