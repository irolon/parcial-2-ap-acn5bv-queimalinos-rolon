import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CompareChart, { CompareTooltip } from '@/components/progress/compare/CompareChart';

vi.mock('recharts', async (importOriginal) => (await import('../../../helpers/progress/recharts')).mockRecharts(importOriginal));

const pt = (day, kg, e1rm = kg + 10) => ({ date: `2026-10-${String(day).padStart(2, '0')}`, max_kg: kg, e1rm_kg: e1rm });
const line = (id, name, color, points, metric = 'e1rm_kg') => ({ id, name, color, points, metric });

const LINES = [
  line('a', 'Press banca', 'var(--color-accent)', [pt(1, 80), pt(5, 82), pt(10, 85)]),
  line('b', 'Sentadilla', 'var(--color-cool)', [pt(2, 100), pt(6, 104), pt(12, 108)]),
  line('c', 'Peso muerto', 'var(--color-hot)', [pt(3, 120), pt(8, 125), pt(14, 130)]),
];

const curves = (container) => [...container.querySelectorAll('.recharts-line-curve')];

describe('CompareChart', () => {
  it('dibuja una línea por ejercicio, con su color, y lo nombra en el aria-label', () => {
    const { container } = render(<CompareChart lines={LINES} />);
    expect(screen.getByRole('img', { name: 'Progresión comparada de Press banca, Sentadilla y Peso muerto' })).toBeInTheDocument();
    expect(curves(container).map((c) => c.getAttribute('stroke'))).toEqual(LINES.map((l) => l.color));
    expect(container.querySelectorAll('.recharts-line-dot')).toHaveLength(9);
  });

  it('muestra la leyenda con el nombre de cada línea', () => {
    render(<CompareChart lines={LINES} />);
    for (const { name } of LINES) expect(screen.getByText(name)).toBeInTheDocument();
  });

  it('con dos líneas el aria-label las une con "y"', () => {
    render(<CompareChart lines={LINES.slice(0, 2)} />);
    expect(screen.getByRole('img', { name: 'Progresión comparada de Press banca y Sentadilla' })).toBeInTheDocument();
  });

  it('aclara la métrica: 1RM estimado salvo que todas las líneas vayan con peso máximo', () => {
    const { unmount } = render(<CompareChart lines={LINES} />);
    expect(screen.getByText('1RM ESTIMADO · KG')).toBeInTheDocument();
    unmount();
    render(<CompareChart lines={LINES.map((l) => ({ ...l, metric: 'max_kg' }))} />);
    expect(screen.getByText('PESO MÁXIMO · KG')).toBeInTheDocument();
  });

  it('el tooltip muestra la fecha larga y una fila por ejercicio con valor ese día', () => {
    const row = { date: '2026-10-05', time: Date.UTC(2026, 9, 5), a: 88.7, b: null, c: 120 };
    render(<CompareTooltip active payload={[{ payload: row }]} lines={LINES} />);
    expect(screen.getByText('5 oct 2026')).toBeInTheDocument();
    expect(screen.getByText('Press banca: 88,7 kg')).toBeInTheDocument();
    expect(screen.getByText('Peso muerto: 120 kg')).toBeInTheDocument();
    expect(screen.queryByText(/Sentadilla/)).not.toBeInTheDocument();
  });

  it('el tooltip no muestra nada si no está activo', () => {
    const { container } = render(<CompareTooltip active={false} payload={[]} lines={LINES} />);
    expect(container).toBeEmptyDOMElement();
  });
});
