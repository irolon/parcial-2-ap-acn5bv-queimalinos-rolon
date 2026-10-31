import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AchievementsCard from '@/components/achievements/AchievementsCard';
import * as hooks from '@/hooks/achievements/useStudentGamification';

vi.mock('@/hooks/achievements/useStudentGamification');

const ok = (data) => ({ isPending: false, isError: false, data });
const failing = { isPending: false, isError: true, error: { message: 'Falló el bloque' }, refetch: vi.fn() };

const unlocked = (name, category, unlocked_at) => ({
  id: name, unlocked_at, achievement: { code: name, name, description: 'd', icon_url: null, category },
});
const assignment = (id, name, status, extra = {}) => ({
  id, status, started_at: '2026-10-01T12:00:00Z', ends_at: '2026-10-31T12:00:00Z', current_progress: 3, goal_value: 12,
  progress_pct: 25, completed_at: null, challenge: { id, name, goal_type: 'sessions_count', goal_value: 12, duration_days: 30 },
  ...extra,
});

function setup({ streak, achievements = [], challenges = [] } = {}) {
  hooks.useStudentStreakQuery.mockReturnValue(streak ?? ok({ current_days: 12, longest_days: 20 }));
  hooks.useStudentAchievementsQuery.mockReturnValue(Array.isArray(achievements) ? ok(achievements) : achievements);
  hooks.useStudentChallengesQuery.mockReturnValue(Array.isArray(challenges) ? ok(challenges) : challenges);
  return render(<AchievementsCard studentId="st-1" />);
}

beforeEach(() => vi.clearAllMocks());

describe('AchievementsCard', () => {
  it('muestra la racha actual y la mejor', () => {
    setup();
    const line = screen.getByText('Racha actual 12 días · Mejor 20 días');
    expect(line).toBeVisible();
    expect(line).toHaveClass('text-hot');
    expect(line.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('lista logros con nombre, fecha en hora argentina e ícono oculto', () => {
    setup({ achievements: [unlocked('Constante', 'streak', '2026-10-31T01:30:00Z')] });
    const item = screen.getByText('Constante').closest('li');
    expect(within(item).getByText('30/10/2026')).toBeVisible();
    expect(item.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('sin logros dice que todavía no desbloqueó', () => {
    setup();
    expect(screen.getByText('Todavía no desbloqueó logros')).toBeVisible();
  });

  it('desafío activo: meta, barra con progress_pct y fecha de fin', () => {
    setup({ challenges: [assignment('a', 'Mes de fuerza', 'active', { progress_pct: 40 })] });
    expect(screen.getByText('Mes de fuerza')).toBeVisible();
    expect(screen.getByText('12 sesiones')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('termina el 31/10')).toBeVisible();
  });

  it('weight_target muestra la meta sin cálculo propio', () => {
    const c = assignment('w', 'Bajar', 'active', { progress_pct: 60 });
    c.challenge = { ...c.challenge, goal_type: 'weight_target', goal_value: 75 };
    setup({ challenges: [c] });
    expect(screen.getByText('Llegar a 75 kg')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
  });

  it('el historial va colapsado y se expande al click', () => {
    setup({ challenges: [assignment('h', 'Viejo', 'completed'), assignment('f', 'Fallido', 'failed')] });
    expect(screen.queryByText('Viejo')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Historial (2)' }));
    expect(screen.getByText('Viejo')).toBeVisible();
    expect(screen.getByText('Fallido')).toBeVisible();
  });

  it('sin desafíos activos lo aclara', () => {
    setup();
    expect(screen.getByText('Sin desafíos activos')).toBeVisible();
  });

  it('cada bloque tiene su error independiente', () => {
    setup({ streak: failing, achievements: [unlocked('Constante', 'streak', '2026-10-30T15:00:00Z')] });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText('Constante')).toBeVisible();
  });

  it('cada bloque tiene su carga independiente', () => {
    setup({ challenges: { isPending: true }, achievements: [unlocked('Constante', 'streak', '2026-10-30T15:00:00Z')] });
    expect(screen.getByText('Constante')).toBeVisible();
    expect(screen.getByText('Racha actual 12 días · Mejor 20 días')).toBeVisible();
    expect(screen.queryByText('Sin desafíos activos')).not.toBeInTheDocument();
  });
});
