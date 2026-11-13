import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import CompareChart, { CompareTooltip } from '@/components/progress/compare/CompareChart';
import { SLOT_STYLES } from '@/utils/progress/compare';

vi.mock('recharts', async (importOriginal) => (await import('../../../helpers/progress/recharts')).mockRecharts(importOriginal));

const pt = (day, kg, e1rm = kg + 10) => ({ date: `2026-10-${String(day).padStart(2, '0')}`, max_kg: kg, e1rm_kg: e1rm });
const line = (id, name, i, points, metric = 'e1rm_kg') => ({ id, name, ...SLOT_STYLES[i], points, metric });

const LINES = [
  line('a', 'Press banca', 0, [pt(1, 80), pt(5, 82), pt(10, 85)]),
  line('b', 'Sentadilla', 1, [pt(2, 100), pt(6, 104), pt(12, 108)]),
  line('c', 'Peso muerto', 2, [pt(3, 120), pt(8, 125), pt(14, 130)]),
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
    expect(screen.getByText('1RM estimado · kg')).toBeInTheDocument();
    unmount();
    render(<CompareChart lines={LINES.map((l) => ({ ...l, metric: 'max_kg' }))} />);
    expect(screen.getByText('Peso máximo · kg')).toBeInTheDocument();
  });

  it('si algunas líneas van con peso máximo las nombra como excepción', () => {
    const { unmount } = render(<CompareChart lines={LINES.map((l) => (l.id === 'b' ? { ...l, metric: 'max_kg' } : l))} />);
    expect(screen.getByText('1RM estimado · kg (Sentadilla: peso máximo)')).toBeInTheDocument();
    unmount();
    render(<CompareChart lines={LINES.map((l) => (l.id === 'a' ? l : { ...l, metric: 'max_kg' }))} />);
    expect(screen.getByText('1RM estimado · kg (Sentadilla y Peso muerto: peso máximo)')).toBeInTheDocument();
  });

  it('cada línea se distingue también por el trazo y la forma del punto, igual en la leyenda', () => {
    // El trazo punteado se aplica al terminar la animación de dibujo: se la adelanta con timers falsos.
    vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame', 'performance', 'Date'] });
    const { container } = render(<CompareChart lines={LINES} />);
    act(() => vi.advanceTimersByTime(3000));
    vi.useRealTimers();
    const dashes = curves(container).map((c) => c.getAttribute('stroke-dasharray') ?? 'none');
    expect(dashes).toEqual(['none', '7 4', '2 3']);
    const shapes = LINES.map((l) => container.querySelector(`.recharts-line-dot[data-shape="${l.shape}"]`));
    expect(shapes.every(Boolean)).toBe(true);
    const marks = [...container.querySelectorAll('[data-slot-mark]')].map((m) => m.getAttribute('data-slot-mark'));
    expect(marks).toEqual(LINES.map((l) => `${l.dash || 'none'}|${l.shape}`));
    expect(new Set(marks).size).toBe(3);
  });

  it('el tooltip muestra la fecha larga y una fila por ejercicio con valor ese día', () => {
    const row = { date: '2026-10-05', time: Date.UTC(2026, 9, 5), a: 88.7, b: null, c: 120 };
    render(<CompareTooltip active payload={[{ payload: row }]} lines={LINES} />);
    expect(screen.getByText('5 oct 2026')).toBeInTheDocument();
    expect(screen.getByText('Press banca: 88,7 kg')).toBeInTheDocument();
    expect(screen.getByText('Peso muerto: 120 kg')).toBeInTheDocument();
    expect(screen.queryByText(/Sentadilla/)).not.toBeInTheDocument();
  });

  it('con Volumen el tooltip usa el mismo formato que el detalle (toneladas desde 1000 kg)', () => {
    const vol = LINES.map((l) => ({ ...l, metric: 'volume_kg' }));
    render(<CompareTooltip active payload={[{ payload: { date: '2026-10-05', a: 12400, b: 950, c: null } }]} lines={vol} />);
    expect(screen.getByText('Press banca: 12,4 t')).toBeInTheDocument();
    expect(screen.getByText('Sentadilla: 950 kg')).toBeInTheDocument();
  });

  it('el eje X lleva pocas marcas parejas aunque las líneas tengan fechas distintas', () => {
    const { container } = render(<CompareChart lines={LINES} />);
    const ticks = [...container.querySelectorAll('.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value')].map((t) => t.textContent);
    expect(ticks.length).toBeLessThanOrEqual(5);
    expect(ticks[0]).toBe('01/10');
    expect(ticks.at(-1)).toBe('14/10');
  });

  it('el tooltip no muestra nada si no está activo', () => {
    const { container } = render(<CompareTooltip active={false} payload={[]} lines={LINES} />);
    expect(container).toBeEmptyDOMElement();
  });
});
