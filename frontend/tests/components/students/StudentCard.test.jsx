import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import StudentCard from '@/components/students/StudentCard';
import { student } from '../../helpers/students/fixtures';

const NOW = new Date('2026-11-09T21:30:00Z');

const renderCard = (overrides) =>
  render(
    <MemoryRouter>
      <ul>
        <StudentCard student={student({ name: 'Lucía Gómez', ...overrides })} now={NOW} search="" />
      </ul>
    </MemoryRouter>,
  );

describe('StudentCard', () => {
  it('sin sesión abierta muestra la última sesión', () => {
    renderCard({ last_session_at: '2026-11-08T21:00:00Z' });
    expect(screen.getByText('Última sesión: Ayer')).toBeInTheDocument();
    expect(screen.queryByText('Entrenando ahora')).not.toBeInTheDocument();
  });

  it('GX4: con open_session, "Entrenando ahora" con punto verde en vez de la última sesión, y la hora argentina de inicio', () => {
    renderCard({ last_session_at: '2026-11-08T21:00:00Z', open_session: { id: 'o-1', started_at: '2026-11-09T21:05:00Z' } });
    const link = screen.getByRole('link', { name: /Lucía Gómez/ });
    const live = within(link).getByText('Entrenando ahora');
    expect(live).toHaveAttribute('title', 'Empezó a las 18:05');
    expect(live.querySelector('[data-live-dot]')).toHaveClass('bg-good');
    expect(within(link).queryByText(/Última sesión/)).not.toBeInTheDocument();
  });
});
