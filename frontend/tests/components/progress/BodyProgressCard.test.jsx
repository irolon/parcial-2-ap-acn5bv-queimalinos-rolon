import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BodyProgressCard, { WeightTooltip } from '@/components/progress/BodyProgressCard';
import { BODY, EMPTY_BODY, renderWithQuery, stubProgress } from '../../helpers/progress/progress';

vi.mock('recharts', async (importOriginal) => (await import('../../helpers/progress/recharts')).mockRecharts(importOriginal));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('BodyProgressCard', () => {
  it('con medidas muestra la línea de peso y las variaciones', async () => {
    stubProgress({ body: BODY });
    const { container } = renderWithQuery(<BodyProgressCard studentId="st-1" />);
    expect(await screen.findByRole('img', { name: 'Evolución del peso corporal' })).toBeInTheDocument();
    expect(container.querySelector('.recharts-line-curve')).toBeInTheDocument();
    expect(screen.getAllByText(/desde el inicio/)).toHaveLength(3);
  });

  it('el tooltip del peso muestra la fecha completa', () => {
    render(<WeightTooltip active payload={[{ payload: { date: '2026-10-01', weight: 80 } }]} />);
    expect(screen.getByText('1 oct 2026')).toBeInTheDocument();
    expect(screen.getByText(/^Peso: 80/)).toBeInTheDocument();
  });

  it('sin medidas muestra el mensaje vacío', async () => {
    stubProgress({ body: EMPTY_BODY });
    renderWithQuery(<BodyProgressCard studentId="st-1" />);
    expect(await screen.findByText(/Todavía no hay medidas cargadas/)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Evolución del peso corporal' })).not.toBeInTheDocument();
  });
});
