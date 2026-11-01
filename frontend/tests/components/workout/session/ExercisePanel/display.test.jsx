import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setCursor } from '@/utils/workout/workoutState';
import { PanelHarness, reps, weight } from '../../../../helpers/workout/exercisePanel';
import { freshWorkout, withSets } from '../../../../helpers/workout/workout';
import { allowSlowScreens } from '../../../../helpers/shared/patience';

allowSlowScreens();

describe('ExercisePanel: lo que muestra', () => {
  it('el ejercicio, su objetivo y "SERIE n DE m · SUGERIDO X KG × R"', () => {
    render(<PanelHarness />);
    expect(screen.getByRole('heading', { name: 'Press banca' })).toBeInTheDocument();
    expect(screen.getByText('OBJETIVO 4 × 10 · DESCANSO 90″')).toBeInTheDocument();
    expect(screen.getByText('SERIE 1 DE 4 · SUGERIDO 62,5 KG × 10')).toBeInTheDocument();
  });

  it('precarga el peso y las reps del plan en los campos', () => {
    render(<PanelHarness />);
    expect(weight()).toHaveValue('62,5');
    expect(reps()).toHaveValue('10');
  });

  it('sin peso en el plan, el campo queda vacío con "Peso corporal" y la sugerencia habla de reps', () => {
    render(<PanelHarness initial={setCursor(freshWorkout(), 1)} />);
    expect(screen.getByText('SERIE 1 DE 3 · SUGERIDO 12 REPS')).toBeInTheDocument();
    expect(weight()).toHaveValue('');
    expect(weight()).toHaveAttribute('placeholder', 'Peso corporal');
    expect(reps()).toHaveValue('12');
  });

  it('con series registradas cuenta la próxima y precarga la última serie, no el plan', () => {
    render(<PanelHarness initial={withSets(freshWorkout(), [[0, 65, 8]])} />);
    expect(screen.getByText('SERIE 2 DE 4 · SUGERIDO 62,5 KG × 10')).toBeInTheDocument();
    expect(weight()).toHaveValue('65');
    expect(reps()).toHaveValue('8');
  });

  it('si la última serie fue de peso corporal, la siguiente también', () => {
    render(<PanelHarness initial={withSets(freshWorkout(), [[0, null, 12]])} />);
    expect(weight()).toHaveValue('');
  });

  it('pasadas las series del plan, la próxima es una extra', () => {
    const rows = [[0, 60, 10], [0, 60, 10], [0, 60, 10], [0, 60, 10]];
    render(<PanelHarness initial={withSets(freshWorkout(), rows)} />);
    expect(screen.getByText('SERIE 5 · EXTRA · SUGERIDO 62,5 KG × 10')).toBeInTheDocument();
  });
});
