import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivityChart from '@/components/students/overview/ActivityChart';
import { daily } from '../../../helpers/students/overview';

// Sin animación: en jsdom no avanza y las barras quedan sin dibujar.
vi.mock('recharts', async (importOriginal) => {
  const mocked = await (await import('../../../helpers/progress/recharts')).mockRecharts(importOriginal);
  const { Bar } = mocked;
  return { ...mocked, Bar: (props) => <Bar {...props} isAnimationActive={false} /> };
});

const ticks = (container) => container.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick');
// 30 días (de hoy − 29 a hoy); los últimos 14 con días en 0.
const COUNTS = [...Array(16).fill(1), 1, 2, 0, 3, 1, 0, 2, 4, 1, 0, 2, 3, 1, 2];
const labels = (container) => [...container.querySelectorAll('.recharts-xAxis-tick-labels text')].map((t) => t.textContent);

describe('ActivityChart', () => {
  it('arranca en 7 días: título, botón presionado, una barra por día y hoy en accent', () => {
    const { container } = render(<ActivityChart daily={daily(COUNTS)} />);
    expect(screen.getByText('Actividad · 7 días')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '14D' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '30D' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img', { name: 'Sesiones terminadas por día, últimos 7 días' })).toBeInTheDocument();
    expect(ticks(container)).toHaveLength(7);
    expect(labels(container).join('')).toMatch(/^[LMXJVSD]{7}$/); // la inicial de cada día
    const bars = [...container.querySelectorAll('.recharts-bar-rectangle path')];
    expect(bars).toHaveLength(6); // el día en 0 no tiene altura
    expect(bars.at(-1)).toHaveAttribute('fill', 'var(--color-accent)');
    expect(bars[0]).toHaveAttribute('fill', 'var(--color-ink4)');
  });

  it('con 14D cambia el título y muestra las 14 barras', async () => {
    const { container } = render(<ActivityChart daily={daily(COUNTS)} />);
    await userEvent.click(screen.getByRole('button', { name: '14D' }));
    expect(screen.getByText('Actividad · 14 días')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '14D' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Sesiones terminadas por día, últimos 14 días' })).toBeInTheDocument();
    expect(ticks(container)).toHaveLength(14);
  });

  it('con 30D: título, 30 barras con hoy en accent y el número de día cada 5 barras', async () => {
    const { container } = render(<ActivityChart daily={daily(Array(30).fill(2))} />);
    await userEvent.click(screen.getByRole('button', { name: '30D' }));
    expect(screen.getByText('Actividad · 30 días')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30D' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img', { name: 'Sesiones terminadas por día, últimos 30 días' })).toBeInTheDocument();
    const bars = [...container.querySelectorAll('.recharts-bar-rectangle path')];
    expect(bars).toHaveLength(30);
    expect(bars.at(-1)).toHaveAttribute('fill', 'var(--color-accent)');
    expect(bars.slice(0, -1).every((b) => b.getAttribute('fill') === 'var(--color-ink4)')).toBe(true);
    const rows = daily(Array(30).fill(2));
    expect(labels(container)).toEqual([0, 5, 10, 15, 20, 25].map((i) => rows[i].date.slice(8, 10)));
  });

  it('con 30D entra una sesión de hace 20 días que en 14D no se ve', async () => {
    const counts = [...Array(9).fill(0), 3, ...Array(20).fill(0)];
    render(<ActivityChart daily={daily(counts)} />);
    await userEvent.click(screen.getByRole('button', { name: '14D' }));
    expect(screen.getByText('Ninguna sesión terminada en los últimos 14 días')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '30D' }));
    expect(screen.getByRole('img', { name: /últimos 30 días/ })).toBeInTheDocument();
  });

  it('todo en 0 en 30 días muestra el texto del mes', async () => {
    render(<ActivityChart daily={daily()} />);
    await userEvent.click(screen.getByRole('button', { name: '30D' }));
    expect(screen.getByText('Ninguna sesión terminada en los últimos 30 días')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('todo en 0 muestra el texto en lugar del gráfico', async () => {
    const counts = [...Array(16).fill(0), 5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    render(<ActivityChart daily={daily(counts)} />);
    expect(screen.getByText('Ninguna sesión terminada en los últimos 7 días')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '14D' }));
    expect(screen.queryByText(/Ninguna sesión terminada/)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /últimos 14 días/ })).toBeInTheDocument();
  });

  it('cargando muestra el esqueleto dentro de la tarjeta', () => {
    render(<ActivityChart />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando el resumen…');
    expect(screen.getByText('Actividad · 7 días')).toBeInTheDocument();
  });
});
