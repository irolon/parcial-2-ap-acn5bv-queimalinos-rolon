import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeekSection from '@/components/student/today/WeekSection';
import { useMyRoutines } from '@/hooks/routines/useStudentRoutines';
import { useSessionsInfinite } from '@/hooks/sessions/useSessions';
import { mineRoutine } from '../../../helpers/routines/studentRoutines';

vi.mock('@/hooks/routines/useStudentRoutines', () => ({ useMyRoutines: vi.fn() }));
vi.mock('@/hooks/sessions/useSessions', () => ({ useSessionsInfinite: vi.fn() }));

const WEDNESDAY = new Date('2026-10-28T18:00:00Z'); // miércoles 28/10, 15:00 en Argentina
const MONDAY = '2026-10-26T13:00:00Z';
const query = (state) => ({ isPending: false, isError: false, refetch: vi.fn(), ...state });
const history = (state) =>
  query({ data: { pages: [{ data: [{ started_at: MONDAY, finished_at: MONDAY }] }] }, ...state });

beforeEach(() => {
  vi.mocked(useMyRoutines).mockReturnValue(query({ data: [mineRoutine({ days: ['monday', 'wednesday'] })] }));
  vi.mocked(useSessionsInfinite).mockReturnValue(history());
});

describe('WeekSection', () => {
  it('con los datos cargados muestra la semana', () => {
    render(<WeekSection now={WEDNESDAY} />);
    expect(screen.getByText('1 de 2 entrenamientos')).toBeInTheDocument();
  });

  it('si fallan las rutinas y no hay datos, lo dice y Reintentar vuelve a pedir solo la que falló', async () => {
    const routines = query({ isError: true });
    const sessions = history();
    vi.mocked(useMyRoutines).mockReturnValue(routines);
    vi.mocked(useSessionsInfinite).mockReturnValue(sessions);
    render(<WeekSection now={WEDNESDAY} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar tu semana.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(routines.refetch).toHaveBeenCalledTimes(1);
    expect(sessions.refetch).not.toHaveBeenCalled();
  });

  it('un refetch fallido que conserva los datos no tapa la semana con el error', () => {
    vi.mocked(useMyRoutines).mockReturnValue(
      query({ isError: true, data: [mineRoutine({ days: ['monday', 'wednesday'] })] }),
    );
    vi.mocked(useSessionsInfinite).mockReturnValue(history({ isError: true }));
    render(<WeekSection now={WEDNESDAY} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('1 de 2 entrenamientos')).toBeInTheDocument();
  });
});
