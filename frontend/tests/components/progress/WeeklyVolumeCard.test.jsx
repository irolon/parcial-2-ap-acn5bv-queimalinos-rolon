import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeeklyVolumeCard from '@/components/progress/WeeklyVolumeCard';
import { week } from '../../helpers/progress/charts';

vi.mock('recharts', async (importOriginal) => (await import('../../helpers/progress/recharts')).mockRecharts(importOriginal));

describe('WeeklyVolumeCard', () => {
  it('dibuja una barra por semana con datos y deja la semana en 0 en el eje', () => {
    const weeks = [week('05', 4000, 2), week('12', 0, 0), week('19', 5200, 3), week('26', 6100, 3)];
    const { container } = render(<WeeklyVolumeCard weeks={weeks} />);
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(3); // la semana en 0 no tiene altura: queda su tick en el eje
    // Los 4 ticks del eje (uno por semana) incluyen la semana en 0.
    expect(container.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick')).toHaveLength(weeks.length);
  });

  it('con menos de 3 semanas entrenadas muestra el aviso', () => {
    render(<WeeklyVolumeCard weeks={[week('05', 4000, 2), week('12', 0, 0), week('19', 100, 1)]} />);
    expect(screen.getByText(/Llevás 2 de 3 semanas entrenadas/)).toBeInTheDocument();
  });

  it('cuenta las semanas con sesiones aunque el volumen sea 0 (peso corporal)', () => {
    const weeks = [week('05', 0, 2), week('12', 0, 1), week('19', 0, 3)];
    render(<WeeklyVolumeCard weeks={weeks} />);
    expect(screen.queryByText(/Llevás/)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Volumen semanal' })).toBeInTheDocument();
  });

  it('no cuenta las semanas sin sesiones', () => {
    render(<WeeklyVolumeCard weeks={[week('05', 0, 2), week('12', 0, 0), week('19', 0, 0)]} />);
    expect(screen.getByText(/Llevás 1 de 3 semanas entrenadas/)).toBeInTheDocument();
  });
});
