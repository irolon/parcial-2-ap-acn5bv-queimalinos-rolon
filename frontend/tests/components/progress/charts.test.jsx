import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ExerciseCurveCard from '@/components/progress/ExerciseCurveCard';
import MetricSelector from '@/components/progress/MetricSelector';
import ProgressKpis from '@/components/progress/ProgressKpis';
import WeeklyVolumeCard from '@/components/progress/WeeklyVolumeCard';

// jsdom no mide el layout: se fija el tamaño del gráfico.
vi.mock('recharts', async (importOriginal) => {
  const { cloneElement } = await import('react');
  return {
    ...(await importOriginal()),
    ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 240 }),
  };
});

const point = (day, e1rm) => ({
  date: `2026-10-${String(day).padStart(2, '0')}`,
  max_kg: e1rm - 10,
  volume_kg: e1rm * 10,
  e1rm_kg: e1rm,
  sets: 3,
  reps: 30,
});

const data = (points) => ({
  exercise: { id: 1, name: 'Press banca', muscle_group: 'pecho' },
  points,
  pr: { max_kg: { value: 90, date: '2026-10-20' }, e1rm_kg: { value: 100, date: '2026-10-20' } },
  default_metric: 'e1rm_kg',
});

const SIX = [1, 5, 10, 15, 20, 25].map((d, i) => point(d, 90 + i * 2));

describe('ExerciseCurveCard', () => {
  it('dibuja un punto por entrenamiento y el chip de récord', () => {
    const { container } = render(<ExerciseCurveCard data={data(SIX)} metric="e1rm_kg" onMetricChange={() => {}} />);
    expect(container.querySelectorAll('.recharts-line-dot')).toHaveLength(6);
    expect(screen.getByText('Récord 100 kg')).toBeInTheDocument();
  });

  it('sin chip de récord para volumen', () => {
    render(<ExerciseCurveCard data={data(SIX)} metric="volume_kg" onMetricChange={() => {}} />);
    expect(screen.queryByText(/^Récord/)).not.toBeInTheDocument();
  });

  it('con menos de 3 puntos muestra el aviso', () => {
    render(<ExerciseCurveCard data={data(SIX.slice(0, 2))} metric="e1rm_kg" onMetricChange={() => {}} />);
    expect(screen.getByText(/Llevás 2 de 3 entrenamientos de Press banca/)).toBeInTheDocument();
  });

  it('no cuenta los puntos sin valor para la métrica', () => {
    const pts = SIX.map((p, i) => (i < 4 ? { ...p, e1rm_kg: null } : p));
    render(<ExerciseCurveCard data={data(pts)} metric="e1rm_kg" onMetricChange={() => {}} />);
    expect(screen.getByText(/Llevás 2 de 3/)).toBeInTheDocument();
  });
});

describe('MetricSelector', () => {
  const options = [
    { value: 'e1rm_kg', label: '1RM estimado', disabled: true },
    { value: 'reps', label: 'Repeticiones' },
  ];

  it('la opción deshabilitada no dispara onChange', () => {
    const onChange = vi.fn();
    render(<MetricSelector value="reps" options={options} onChange={onChange} />);
    const disabled = screen.getByRole('button', { name: '1RM estimado' });
    expect(disabled).toBeDisabled();
    expect(disabled).toHaveAttribute('title', 'Sin peso registrado');
    fireEvent.click(disabled);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('elegir una opción habilitada avisa', () => {
    const onChange = vi.fn();
    render(<MetricSelector value="e1rm_kg" options={options} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Repeticiones' }));
    expect(onChange).toHaveBeenCalledWith('reps');
  });
});

const week = (day, volume_kg, sessions) => ({ week_start: `2026-10-${day}`, volume_kg, sessions });

describe('WeeklyVolumeCard', () => {
  it('dibuja una barra por semana, incluso las que están en 0', () => {
    const weeks = [week('05', 4000, 2), week('12', 0, 0), week('19', 5200, 3), week('26', 6100, 3)];
    const { container } = render(<WeeklyVolumeCard weeks={weeks} />);
    expect(container.querySelectorAll('.recharts-bar-rectangle').length).toBeGreaterThanOrEqual(3);
  });

  it('con menos de 3 semanas entrenadas muestra el aviso', () => {
    render(<WeeklyVolumeCard weeks={[week('05', 4000, 2), week('12', 0, 0), week('19', 100, 1)]} />);
    expect(screen.getByText(/Llevás 2 de 3 semanas entrenadas/)).toBeInTheDocument();
  });
});

describe('ProgressKpis', () => {
  const weeks = [week('05', 4000, 2), week('12', 8400, 3)];
  const pr = data(SIX).pr;

  it('suma sesiones y volumen y formatea el récord', () => {
    render(<ProgressKpis weeks={weeks} pr={pr} metric="max_kg" />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12,4 t')).toBeInTheDocument();
    expect(screen.getByText('90 kg')).toBeInTheDocument();
  });

  it('con volumen muestra el récord de 1RM y sin récords, una raya', () => {
    const { rerender } = render(<ProgressKpis weeks={weeks} pr={pr} metric="volume_kg" />);
    expect(screen.getByText('100 kg')).toBeInTheDocument();
    rerender(<ProgressKpis weeks={weeks} pr={{ max_kg: null, e1rm_kg: null }} metric="reps" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
