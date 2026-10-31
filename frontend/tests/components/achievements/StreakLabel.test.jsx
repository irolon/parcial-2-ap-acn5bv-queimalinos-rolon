import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StreakLabel from '@/components/achievements/StreakLabel';

const streak = (current_days, longest_days = current_days) => ({ current_days, longest_days, last_trained_date: null });

describe('StreakLabel', () => {
  it('con racha muestra los días con 🔥 y en hot', () => {
    render(<StreakLabel streak={streak(12)} />);
    expect(screen.getByText('🔥 12 días')).toHaveClass('text-hot');
  });

  it('un solo día va en singular', () => {
    render(<StreakLabel streak={streak(1)} />);
    expect(screen.getByText('🔥 1 día')).toBeInTheDocument();
  });

  it('sin racha actual pero con mejor marca la muestra', () => {
    render(<StreakLabel streak={streak(0, 20)} />);
    expect(screen.getByText('Sin racha · mejor: 20 días')).toBeInTheDocument();
  });

  it('null o todo en 0 es "Sin racha"', () => {
    const { rerender } = render(<StreakLabel streak={null} />);
    expect(screen.getByText('Sin racha')).toBeInTheDocument();
    rerender(<StreakLabel streak={streak(0, 0)} />);
    expect(screen.getByText('Sin racha')).toBeInTheDocument();
  });
});
