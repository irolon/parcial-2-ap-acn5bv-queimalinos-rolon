import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChallengeProgressList from '@/components/achievements/ChallengeProgressList';
import { assignment } from '../../helpers/achievements/gamification';

describe('ChallengeProgressList', () => {
  it('sin desafíos activos, el entrenador lee "Sin desafíos activos", también por defecto', () => {
    const { rerender } = render(<ChallengeProgressList items={[]} />);
    expect(screen.getByText('Sin desafíos activos')).toBeVisible();
    rerender(<ChallengeProgressList items={[]} viewer="trainer" />);
    expect(screen.getByText('Sin desafíos activos')).toBeVisible();
    expect(screen.queryByText('No tenés desafíos activos')).toBeNull();
  });

  it('sin desafíos activos, el alumno lee "No tenés desafíos activos"', () => {
    render(<ChallengeProgressList items={[]} viewer="student" />);
    expect(screen.getByText('No tenés desafíos activos')).toBeVisible();
    expect(screen.queryByText('Sin desafíos activos')).toBeNull();
  });

  it('con solo historial el alumno sigue sin activos y puede abrir el historial', () => {
    render(<ChallengeProgressList items={[assignment('h', 'Viejo', 'completed')]} viewer="student" />);
    expect(screen.getByText('No tenés desafíos activos')).toBeVisible();
    expect(screen.queryByText('Viejo')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Historial (1)' }));
    expect(screen.getByText('Viejo')).toBeVisible();
    expect(screen.getByText('Completado')).toBeVisible();
  });

  it.each(['trainer', 'student'])('con un desafío activo (viewer=%s) muestra la barra y no dice que no hay', (viewer) => {
    render(<ChallengeProgressList items={[assignment('a', 'Mes de fuerza', 'active', { progress_pct: 40 })]} viewer={viewer} />);
    expect(screen.getByText('Mes de fuerza')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Progreso de Mes de fuerza' })).toHaveAttribute('aria-valuenow', '40');
    expect(screen.queryByText(/desafíos activos/)).toBeNull();
  });
});
