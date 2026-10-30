import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExerciseCurveCard, { CurveTooltip } from '@/components/progress/ExerciseCurveCard';
import { SIX, curveData } from '../../helpers/progress/charts';

vi.mock('recharts', async (importOriginal) => (await import('../../helpers/progress/recharts')).mockRecharts(importOriginal));

const noop = () => {};
const dots = (container) => [...container.querySelectorAll('.recharts-line-dot')];

describe('ExerciseCurveCard', () => {
  it('dibuja un punto por entrenamiento y el chip de récord', () => {
    const { container } = render(<ExerciseCurveCard data={curveData(SIX)} metric="e1rm_kg" onMetricChange={noop} />);
    expect(dots(container)).toHaveLength(6);
    expect(screen.getByText('Récord 100 kg')).toBeInTheDocument();
  });

  it('resalta el punto del récord con otro radio y color', () => {
    const { container } = render(<ExerciseCurveCard data={curveData(SIX)} metric="e1rm_kg" onMetricChange={noop} />);
    const hot = dots(container).filter((c) => c.getAttribute('r') === '6');
    expect(hot).toHaveLength(1);
    expect(hot[0]).toHaveAttribute('fill', 'var(--color-hot)');
  });

  it('el eje X es de tiempo: la separación entre puntos es proporcional a los días', () => {
    const { container } = render(<ExerciseCurveCard data={curveData(SIX)} metric="e1rm_kg" onMetricChange={noop} />);
    const xs = dots(container).map((c) => Number(c.getAttribute('cx')));
    // Días 1, 5 y 10: 4 días vs. 5 días (en un eje de categorías serían iguales).
    expect((xs[2] - xs[1]) / (xs[1] - xs[0])).toBeCloseTo(5 / 4, 1);
    expect(container.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick').length).toBeGreaterThan(1);
  });

  it('sin chip de récord para volumen', () => {
    render(<ExerciseCurveCard data={curveData(SIX)} metric="volume_kg" onMetricChange={noop} />);
    expect(screen.queryByText(/^Récord/)).not.toBeInTheDocument();
  });

  it('con menos de 3 puntos muestra el aviso', () => {
    render(<ExerciseCurveCard data={curveData(SIX.slice(0, 2))} metric="e1rm_kg" onMetricChange={noop} />);
    expect(screen.getByText(/Llevás 2 de 3 entrenamientos de Press banca/)).toBeInTheDocument();
  });

  it('no cuenta los puntos sin valor para la métrica', () => {
    const pts = SIX.map((p, i) => (i < 4 ? { ...p, e1rm_kg: null } : p));
    render(<ExerciseCurveCard data={curveData(pts)} metric="e1rm_kg" onMetricChange={noop} />);
    expect(screen.getByText(/Llevás 2 de 3/)).toBeInTheDocument();
  });
});

describe('CurveTooltip', () => {
  const payload = (extra) => [{ payload: { date: '2026-10-20', e1rm_kg: 100, sets: 3, reps: 19, ...extra } }];

  it('muestra la fecha, la métrica y "N series · M reps" (reps es el total del día)', () => {
    render(<CurveTooltip active payload={payload()} metric="e1rm_kg" />);
    expect(screen.getByText('20 oct 2026')).toBeInTheDocument();
    expect(screen.getByText('1RM estimado: 100 kg')).toBeInTheDocument();
    expect(screen.getByText('3 series · 19 reps')).toBeInTheDocument();
  });

  it('usa el singular con una sola serie', () => {
    render(<CurveTooltip active payload={payload({ sets: 1, reps: 8 })} metric="e1rm_kg" />);
    expect(screen.getByText('1 serie · 8 reps')).toBeInTheDocument();
  });

  it('no dibuja nada si no está activo', () => {
    const { container } = render(<CurveTooltip active={false} payload={payload()} metric="e1rm_kg" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('con días suficientes en total pero pocos en el rango sugiere probar con Todo', () => {
    render(<ExerciseCurveCard data={curveData(SIX.slice(0, 1))} metric="e1rm_kg" onMetricChange={noop} range="3m" totalDays={10} />);
    expect(screen.getByText('Pocos entrenamientos en este rango: probá con Todo')).toBeInTheDocument();
    expect(screen.queryByText(/Llevás/)).not.toBeInTheDocument();
  });

  it('con menos de 3 días en total mantiene "Llevás N de 3"', () => {
    render(<ExerciseCurveCard data={curveData(SIX.slice(0, 1))} metric="e1rm_kg" onMetricChange={noop} range="3m" totalDays={2} />);
    expect(screen.getByText(/Llevás 1 de 3 entrenamientos/)).toBeInTheDocument();
  });

  it('el chip dice "Récord" con Todo y "Mejor del rango" con 1 o 3 meses', () => {
    const { rerender } = render(<ExerciseCurveCard data={curveData(SIX)} metric="e1rm_kg" onMetricChange={noop} range="1m" />);
    expect(screen.getByText('Mejor del rango 100 kg')).toBeInTheDocument();
    rerender(<ExerciseCurveCard data={curveData(SIX)} metric="e1rm_kg" onMetricChange={noop} range="all" />);
    expect(screen.getByText('Récord 100 kg')).toBeInTheDocument();
  });

  it('1RM sin valores queda deshabilitado con "Sin datos en este rango"', () => {
    const pts = SIX.map((p) => ({ ...p, e1rm_kg: null }));
    render(<ExerciseCurveCard data={curveData(pts)} metric="max_kg" onMetricChange={noop} />);
    const btn = screen.getByRole('button', { name: '1RM estimado' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'Sin datos en este rango');
  });
});
