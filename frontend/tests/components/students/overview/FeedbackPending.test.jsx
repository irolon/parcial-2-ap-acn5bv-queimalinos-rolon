import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import FeedbackPending from '@/components/students/overview/FeedbackPending';
import { feedbackRow } from '../../../helpers/students/overview';

const DAY_MS = 24 * 60 * 60 * 1000;

const renderPending = (pending) =>
  render(
    <MemoryRouter>
      <FeedbackPending pending={pending} />
    </MemoryRouter>,
  );

describe('FeedbackPending', () => {
  it('cada fila linkea a la ficha con rutina, RPE y hace cuántos días', () => {
    const finished = new Date(Date.now() - 2 * DAY_MS).toISOString();
    renderPending([feedbackRow({ student_id: 'st-9', name: 'Tomás Rivera', finished_at: finished })]);
    expect(screen.getByText('Feedback pendiente')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Tomás Rivera/ });
    expect(link).toHaveAttribute('href', '/pt/alumnos/st-9');
    expect(within(link).getByText('Push día 3')).toBeInTheDocument();
    expect(within(link).getByText('RPE 8')).toBeInTheDocument();
    expect(within(link).getByText('hace 2 d')).toBeInTheDocument();
  });

  it('una de hoy dice "hace un momento" en una sola línea (columna de Actividad reciente)', () => {
    renderPending([feedbackRow({ finished_at: new Date().toISOString() })]);
    const label = screen.getByText('hace un momento');
    expect(label).toHaveClass('w-24', 'whitespace-nowrap');
  });

  it('lista hasta 5 y resume el resto en "y N más"', () => {
    renderPending(Array.from({ length: 7 }, (_, i) => feedbackRow({ session_id: `s-${i}`, name: `Alumno ${i}` })));
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toHaveLength(5);
    expect(screen.getByRole('link', { name: /Alumno 4/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Alumno 5/ })).not.toBeInTheDocument();
    expect(screen.getByText('y 2 más')).toBeInTheDocument();
  });

  it('con 5 o menos no dice "más"', () => {
    renderPending([feedbackRow({ rpe: null, routine_name: null })]);
    expect(screen.queryByText(/más$/)).not.toBeInTheDocument();
    expect(screen.getByText('RPE —')).toBeInTheDocument();
    expect(screen.getByText('Sin rutina')).toBeInTheDocument();
  });

  it('vacía lo dice', () => {
    renderPending([]);
    expect(screen.getByText('Comentaste todas las sesiones de los últimos 7 días.')).toBeInTheDocument();
  });

  it('cargando muestra el esqueleto', () => {
    renderPending(undefined);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando el resumen…');
  });
});
