import { afterEach, describe, expect, it, vi } from 'vitest';
import { calls } from '../../../helpers/shared/fetchMock';
import { block, renderMine } from '../../../helpers/achievements/renderMine';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const streak = (current, longest) => ({ current_streak_days: current, longest_streak_days: longest, last_session_date: null });

describe('MyAchievements: Tu racha', () => {
  it('muestra la racha actual y el récord, con el fuego decorativo', async () => {
    renderMine({ streak: streak(6, 9) });
    const line = await block('Tu racha').findByText('Racha actual 6 días · Récord 9 días');
    expect(line).toBeVisible();
    expect(line).toHaveClass('text-hot');
    expect(line.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('con 1 día va en singular', async () => {
    renderMine({ streak: streak(1, 1) });
    expect(await block('Tu racha').findByText('Racha actual 1 día · Récord 1 día')).toBeVisible();
  });

  it('con la racha cortada dice 0 días, conserva el récord y no va con el color del fuego', async () => {
    renderMine({ streak: streak(0, 9) });
    const line = await block('Tu racha').findByText('Racha actual 0 días · Récord 9 días');
    expect(line).not.toHaveClass('text-hot');
  });

  it('sin racha ni récord lo dice sin números', async () => {
    renderMine({ streak: streak(0, 0) });
    expect(await block('Tu racha').findByText('Todavía no tenés racha')).toBeVisible();
    expect(block('Tu racha').queryByText(/Racha actual/)).toBeNull();
  });

  it('pide la racha del propio alumno', async () => {
    const fetchMock = renderMine({ streak: streak(2, 3) });
    await block('Tu racha').findByText(/Racha actual/);
    expect(calls(fetchMock).map(([path]) => path)).toContain('/students/s-1/streak');
  });
});
