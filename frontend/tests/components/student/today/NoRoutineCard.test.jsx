import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NoRoutineCard from '@/components/student/today/NoRoutineCard';
import { mineRoutine } from '../../../helpers/routines/studentRoutines';

const WEDNESDAY = new Date('2026-10-28T18:00:00Z'); // miércoles 28/10, 15:00 en Argentina
const query = (state) => ({ isPending: false, isError: false, refetch: vi.fn(), ...state });
const routine = (...days) => mineRoutine({ days });

describe('NoRoutineCard', () => {
  // Review Focus 3: un día de descanso no se confunde con un alumno sin rutina asignada.
  it('sin rutinas asignadas dice que el entrenador todavía no le asignó una', () => {
    render(<NoRoutineCard routines={query({ data: [] })} now={WEDNESDAY} />);
    expect(screen.getByText('Tu entrenador todavía no te asignó una rutina')).toBeInTheDocument();
    expect(screen.queryByText('Hoy es descanso')).not.toBeInTheDocument();
    expect(screen.queryByText(/Próximo/)).not.toBeInTheDocument();
  });

  it('con rutinas pero hoy no toca, dice "Hoy es descanso" y el próximo día de entrenamiento', () => {
    render(<NoRoutineCard routines={query({ data: [routine('thursday', 'saturday')] })} now={WEDNESDAY} />);
    expect(screen.getByText('Hoy es descanso')).toBeInTheDocument();
    expect(screen.getByText('Próximo: jueves')).toBeInTheDocument();
    expect(screen.queryByText('Tu entrenador todavía no te asignó una rutina')).not.toBeInTheDocument();
  });

  it('el próximo día junta los días de todas las rutinas', () => {
    render(<NoRoutineCard routines={query({ data: [routine('saturday'), routine('friday')] })} now={WEDNESDAY} />);
    expect(screen.getByText('Próximo: viernes')).toBeInTheDocument();
  });

  it('rutinas sin días no inventan un próximo día', () => {
    render(<NoRoutineCard routines={query({ data: [routine()] })} now={WEDNESDAY} />);
    expect(screen.getByText('Hoy es descanso')).toBeInTheDocument();
    expect(screen.queryByText(/Próximo/)).not.toBeInTheDocument();
  });

  it('mientras carga las rutinas muestra el estado de carga', () => {
    render(<NoRoutineCard routines={query({ isPending: true })} now={WEDNESDAY} />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tus rutinas…');
  });

  it('si falla, lo dice y deja reintentar', async () => {
    const routines = query({ isError: true });
    render(<NoRoutineCard routines={routines} now={WEDNESDAY} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar tus rutinas.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(routines.refetch).toHaveBeenCalledTimes(1);
  });

  it('un refetch fallido que conserva las rutinas no tapa la tarjeta con el error', () => {
    render(<NoRoutineCard routines={query({ isError: true, data: [routine('thursday')] })} now={WEDNESDAY} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Hoy es descanso')).toBeInTheDocument();
    expect(screen.getByText('Próximo: jueves')).toBeInTheDocument();
  });
});
