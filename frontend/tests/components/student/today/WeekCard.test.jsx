import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import WeekCard from '@/components/student/today/WeekCard';
import { weekStrip } from '@/utils/routines/week';

const SUNDAY = new Date('2026-11-01T13:00:00Z'); // domingo 1/11, 10:00: la semana va del lunes 26/10 a hoy
const done = (iso) => ({ started_at: iso, finished_at: iso });

const strip = (routineDays, sessions = []) => weekStrip({ routineDays, sessions, now: SUNDAY });
const chips = () => within(screen.getByRole('list', { name: 'Esta semana' })).getAllByRole('listitem');

describe('WeekCard', () => {
  it('muestra los siete días de L a D y cuenta los entrenamientos de la semana', () => {
    render(<WeekCard strip={strip(['monday', 'thursday'], [done('2026-10-26T13:00:00Z')])} />);
    expect(screen.getByText('Esta semana')).toBeInTheDocument();
    expect(chips().map((chip) => chip.firstElementChild.textContent).join('')).toBe('LMXJVSD');
    expect(screen.getByText('1 de 2 entrenamientos')).toBeInTheDocument();
  });

  it('la letra de cada día es visual (aria-hidden) y su estado va en un texto solo para lectores de pantalla', () => {
    render(<WeekCard strip={strip(['monday'], [done('2026-10-26T13:00:00Z')])} />);
    const [monday] = chips();
    expect(monday.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(monday.firstElementChild).toHaveTextContent('L');
    expect(within(monday).getByText('Lunes: entrenaste')).toHaveClass('sr-only');
  });

  it('cada día dice si entrenó, si le tocaba o si descansa, y cuál es hoy', () => {
    render(<WeekCard strip={strip(['monday', 'thursday', 'sunday'], [done('2026-10-26T13:00:00Z')])} />);
    expect(screen.getByText('Lunes: entrenaste')).toBeInTheDocument();
    expect(screen.getByText('Martes: descanso')).toBeInTheDocument();
    expect(screen.getByText('Jueves: día de entrenamiento')).toBeInTheDocument();
    expect(screen.getByText('Domingo: día de entrenamiento, hoy')).toBeInTheDocument();
  });

  it('un día entrenado que no tocaba figura como entrenado', () => {
    render(<WeekCard strip={strip(['monday'], [done('2026-10-27T13:00:00Z')])} />);
    expect(screen.getByText('Martes: entrenaste')).toBeInTheDocument();
    expect(screen.getByText('0 de 1 entrenamiento · +1 extra')).toBeInTheDocument();
  });

  it('marca hoy en un solo día', () => {
    render(<WeekCard strip={strip(['monday'])} />);
    expect(chips().filter((chip) => chip.textContent.endsWith(', hoy'))).toHaveLength(1);
  });

  it('un entrenamiento de más no pasa de lo que toca: va aparte como "+N extra"', () => {
    const sessions = ['2026-10-26', '2026-10-27', '2026-10-28'].map((day) => done(`${day}T13:00:00Z`));
    render(<WeekCard strip={strip(['monday', 'wednesday'], sessions)} />);
    expect(screen.getByText('2 de 2 entrenamientos · +1 extra')).toBeInTheDocument();
  });

  it('sin días planificados no dice "0 de 0"', () => {
    render(<WeekCard strip={strip([])} />);
    expect(screen.getByText('Sin entrenamientos planificados')).toBeInTheDocument();
  });
});
