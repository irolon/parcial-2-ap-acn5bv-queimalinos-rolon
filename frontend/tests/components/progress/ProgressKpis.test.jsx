import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressKpis from '@/components/progress/ProgressKpis';
import { SIX, curveData, week } from '../../helpers/progress/charts';

const weeks = [week('05', 4000, 2), week('12', 8400, 3)];
const pr = curveData(SIX).pr;

describe('ProgressKpis', () => {
  it('suma sesiones y volumen y formatea el récord', () => {
    render(<ProgressKpis weeks={weeks} pr={pr} metric="max_kg" />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12,4 t')).toBeInTheDocument();
    expect(screen.getByText('90 kg')).toBeInTheDocument();
  });

  it('con volumen muestra el récord de 1RM, y sin 1RM el de peso máximo', () => {
    const { rerender } = render(<ProgressKpis weeks={weeks} pr={pr} metric="volume_kg" />);
    expect(screen.getByText('100 kg')).toBeInTheDocument();
    rerender(<ProgressKpis weeks={weeks} pr={{ ...pr, e1rm_kg: null }} metric="reps" />);
    expect(screen.getByText('90 kg')).toBeInTheDocument();
  });

  it('sin récords muestra una raya', () => {
    render(<ProgressKpis weeks={weeks} pr={{ max_kg: null, e1rm_kg: null }} metric="reps" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
