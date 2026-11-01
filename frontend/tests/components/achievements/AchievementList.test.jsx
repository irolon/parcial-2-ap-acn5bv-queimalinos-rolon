import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AchievementList from '@/components/achievements/AchievementList';

const item = (name, category, unlockedAt) => ({
  id: name,
  unlocked_at: unlockedAt,
  achievement: { code: name, name, description: `Descripción de ${name}`, icon_url: null, category },
});

describe('AchievementList', () => {
  it.each([undefined, 'trainer', 'student'])('con viewer=%s lista el logro con su fecha en hora argentina', (viewer) => {
    render(<AchievementList items={[item('Constante', 'streak', '2026-10-31T01:30:00Z')]} viewer={viewer} />);
    const row = screen.getByText('Constante').closest('li');
    expect(within(row).getByText('30/10/2026')).toBeVisible();
    expect(row.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Constante')).toHaveAttribute('title', 'Descripción de Constante');
  });

  it('con logros no aparece ningún texto de vacío', () => {
    render(<AchievementList items={[item('Constante', 'streak', '2026-10-31T01:30:00Z')]} viewer="student" />);
    expect(screen.queryByText(/Todavía no desbloque/)).toBeNull();
  });

  it('sin logros, el entrenador lee el vacío en tercera persona, también por defecto', () => {
    const { rerender } = render(<AchievementList items={[]} />);
    expect(screen.getByText('Todavía no desbloqueó logros')).toBeVisible();
    rerender(<AchievementList items={[]} viewer="trainer" />);
    expect(screen.getByText('Todavía no desbloqueó logros')).toBeVisible();
    expect(screen.queryByText('Todavía no desbloqueaste logros')).toBeNull();
  });

  it('sin logros, el alumno lo lee en segunda persona', () => {
    render(<AchievementList items={[]} viewer="student" />);
    expect(screen.getByText('Todavía no desbloqueaste logros')).toBeVisible();
    expect(screen.queryByText('Todavía no desbloqueó logros')).toBeNull();
  });
});
