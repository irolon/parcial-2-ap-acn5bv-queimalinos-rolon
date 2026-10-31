import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChallengeCard from '@/components/challenges/ChallengeCard';
import { challenge } from '../../helpers/challenges/challenges';

const setup = (overrides, handlers = {}) => {
  const props = { onAssign: vi.fn(), onDelete: vi.fn(), ...handlers };
  render(<ChallengeCard challenge={challenge(overrides)} {...props} />);
  return props;
};

describe('ChallengeCard', () => {
  it('muestra nombre y meta · duración', () => {
    setup();
    expect(screen.getByText('Mes de fuerza')).toBeVisible();
    expect(screen.getByText('12 sesiones · 30 días')).toBeVisible();
  });

  it('marca el premio y los activos solo cuando corresponden', () => {
    setup({ reward_achievement_id: 'a-1', active_count: 3 });
    expect(screen.getByText('Desafío cumplido')).toBeVisible();
    expect(screen.getByText('3 activos')).toBeVisible();
  });

  it('sin premio ni activos no muestra esas marcas', () => {
    setup();
    expect(screen.queryByText('Desafío cumplido')).not.toBeInTheDocument();
    expect(screen.queryByText(/activos/)).not.toBeInTheDocument();
  });

  it('"Asignar" avisa con el desafío', async () => {
    const { onAssign } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }));
    expect(onAssign).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-1' }));
  });

  it('"Borrar" solo en propios sin asignaciones', async () => {
    const { onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-1' }));
  });

  it.each([
    ['con asignaciones', { assignments_count: 2 }],
    ['plantilla', { trainer_id: null }],
  ])('no ofrece "Borrar" (%s)', (_, overrides) => {
    setup(overrides);
    expect(screen.queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument();
  });
});
