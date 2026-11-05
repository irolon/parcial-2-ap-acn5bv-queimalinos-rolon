import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TodayHeader from '@/components/student/today/TodayHeader';

const SUNDAY = new Date('2026-11-01T13:00:00Z'); // domingo 1/11, 10:00 en Argentina

describe('TodayHeader', () => {
  it('saluda por el primer nombre y dice la fecha en Argentina', () => {
    render(<TodayHeader name="Tomás Ruiz" now={SUNDAY} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Hola, Tomás' })).toBeInTheDocument();
    expect(screen.getByText('Domingo 1 de noviembre')).toBeInTheDocument();
  });

  it('a las 23:59 del domingo todavía es domingo (en UTC ya es lunes)', () => {
    render(<TodayHeader name="Tomás" now={new Date('2026-11-02T02:59:00Z')} />);
    expect(screen.getByText('Domingo 1 de noviembre')).toBeInTheDocument();
  });

  it('sin nombre solo dice "Hola"', () => {
    render(<TodayHeader now={SUNDAY} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Hola' })).toBeInTheDocument();
  });

  it.each([
    [12, 'Racha 12 días'],
    [1, 'Racha 1 día'],
  ])('con una racha de %i muestra la pastilla "%s"', (days, text) => {
    render(<TodayHeader name="Tomás" now={SUNDAY} streakDays={days} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it.each([[0], [undefined], [null]])('con racha %s no hay pastilla', (days) => {
    render(<TodayHeader name="Tomás" now={SUNDAY} streakDays={days} />);
    expect(screen.queryByText(/Racha/)).not.toBeInTheDocument();
  });
});
