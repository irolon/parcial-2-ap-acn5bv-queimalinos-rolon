import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import RecentActivity from '@/components/students/overview/RecentActivity';
import { recentSession } from '../../../helpers/students/overview';

const renderRecent = (recent) =>
  render(
    <MemoryRouter>
      <RecentActivity recent={recent} />
    </MemoryRouter>,
  );

describe('RecentActivity', () => {
  it('cada fila linkea a la ficha con rutina, RPE y tiempo relativo', () => {
    const at = new Date(Date.now() - 12 * 60 * 1000).toISOString();
    renderRecent([recentSession({ student_id: 'st-9', name: 'Tomás Rivera', finished_at: at })]);
    const link = screen.getByRole('link', { name: /Tomás Rivera/ });
    expect(link).toHaveAttribute('href', '/pt/alumnos/st-9');
    expect(within(link).getByText('Push día 3')).toBeInTheDocument();
    expect(within(link).getByText('RPE 8')).toBeInTheDocument();
    expect(within(link).getByText('hace 12 min')).toBeInTheDocument();
  });

  it('sin rutina ni RPE lo dice', () => {
    renderRecent([recentSession({ routine_name: null, rpe: null })]);
    expect(screen.getByText('Sin rutina')).toBeInTheDocument();
    expect(screen.getByText('RPE —')).toBeInTheDocument();
  });

  it('lista todas en el orden recibido', () => {
    renderRecent([
      recentSession({ session_id: 'a', name: 'Ana Paz' }),
      recentSession({ session_id: 'b', name: 'Beto Gil' }),
    ]);
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual([
      expect.stringContaining('Ana Paz'),
      expect.stringContaining('Beto Gil'),
    ]);
  });

  it('sin sesiones terminadas lo dice', () => {
    renderRecent([]);
    expect(screen.getByText('Actividad reciente')).toBeInTheDocument();
    expect(screen.getByText('Todavía nadie terminó una sesión')).toBeInTheDocument();
  });

  it('cargando muestra el esqueleto', () => {
    renderRecent(undefined);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando el resumen…');
  });
});
