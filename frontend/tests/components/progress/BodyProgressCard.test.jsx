import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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

  it.each([undefined, 'trainer'])('sin medidas, viewer=%s lee que el entrenador o el alumno las cargan desde la app', async (viewer) => {
    stubProgress({ body: EMPTY_BODY });
    renderWithQuery(<BodyProgressCard studentId="st-1" viewer={viewer} />);
    expect(
      await screen.findByText('Todavía no hay medidas cargadas. Tu entrenador o vos pueden cargarlas desde la app'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Evolución del peso corporal' })).not.toBeInTheDocument();
  });

  it('sin medidas, el alumno lee que puede cargarlas desde Mi perfil, con el link a su perfil', async () => {
    stubProgress({ body: EMPTY_BODY });
    renderWithQuery(
      <MemoryRouter>
        <BodyProgressCard studentId="st-1" viewer="student" />
      </MemoryRouter>,
    );
    const hint = await screen.findByText(/Todavía no hay medidas cargadas\./);
    expect(hint).toHaveTextContent('Todavía no hay medidas cargadas. Podés cargarlas desde Mi perfil');
    expect(hint).not.toHaveTextContent('Tu entrenador');
    expect(within(hint).getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('href', '/alumno/perfil');
  });

  it('con medidas el alumno no ve la invitación a cargarlas', async () => {
    stubProgress({ body: BODY });
    renderWithQuery(
      <MemoryRouter>
        <BodyProgressCard studentId="st-1" viewer="student" />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('img', { name: 'Evolución del peso corporal' })).toBeInTheDocument();
    expect(screen.queryByText(/Todavía no hay medidas cargadas/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mi perfil' })).not.toBeInTheDocument();
  });
});
