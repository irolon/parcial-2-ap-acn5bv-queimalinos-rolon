import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LockedAchievementList from '@/components/achievements/LockedAchievementList';
import { achievement } from '../../helpers/achievements/gamification';

describe('LockedAchievementList', () => {
  it('cada logro va con su nombre y su avance, en gris y con el ícono decorativo', () => {
    render(<LockedAchievementList items={[achievement('Constancia', { category: 'streak', current: 7, target: 10 })]} />);
    const row = screen.getByText('Constancia').closest('li');
    expect(within(row).getByText('7/10 sesiones')).toBeVisible();
    expect(screen.getByText('Constancia')).toHaveClass('text-ink6');
    const icon = row.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveClass('text-ink5');
    expect(icon).not.toHaveClass('text-hot');
  });

  it('el nombre lleva la descripción como ayuda', () => {
    render(<LockedAchievementList items={[achievement('Constancia')]} />);
    expect(screen.getByText('Constancia')).toHaveAttribute('title', 'Descripción de Constancia');
  });

  it('dice la unidad de cada tipo de criterio y cómo se gana el de desafío', () => {
    render(
      <LockedAchievementList
        items={[
          achievement('Racha', { criteria_type: 'streak', current: 3, target: 7 }),
          achievement('Récords', { criteria_type: 'pr_count', current: 1, target: 5 }),
          achievement('Semanas', { criteria_type: 'full_week', current: 2, target: 4 }),
          achievement('Desafiante', { criteria_type: 'challenge', current: 0, target: 1 }),
        ]}
      />,
    );
    const rowOf = (name) => within(screen.getByText(name).closest('li'));
    expect(rowOf('Racha').getByText('3/7 días')).toBeVisible();
    expect(rowOf('Récords').getByText('1/5 récords')).toBeVisible();
    expect(rowOf('Semanas').getByText('2/4 semanas completas')).toBeVisible();
    expect(rowOf('Desafiante').getByText('Se gana con un desafío')).toBeVisible();
  });

  it('un tipo que no sabe medir va solo con el nombre', () => {
    render(<LockedAchievementList items={[achievement('Misterio', { criteria_type: 'algo_nuevo' })]} />);
    expect(screen.getByText('Misterio').closest('li')).toHaveTextContent(/^Misterio$/);
  });

  it('la lista se llama "Logros por desbloquear" para quien la lee con un lector de pantalla', () => {
    render(<LockedAchievementList items={[achievement('Constancia'), achievement('Fuerza')]} />);
    const list = screen.getByRole('list', { name: 'Logros por desbloquear' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('sin logros bloqueados no dibuja nada', () => {
    const { container } = render(<LockedAchievementList items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
