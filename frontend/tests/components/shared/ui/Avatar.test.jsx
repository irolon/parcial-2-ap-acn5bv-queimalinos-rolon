import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Avatar from '@/components/shared/ui/Avatar';

const PHOTO = 'https://storage.test/avatars/a.jpg?token=1';
const NEW_PHOTO = 'https://storage.test/avatars/b.jpg?token=2';
const photoOf = (container) => container.querySelector('img');

describe('Avatar con foto', () => {
  it('con src dibuja la foto en lugar de las iniciales y conserva el nombre accesible', () => {
    const { container } = render(<Avatar name="Ana Pérez" src={PHOTO} />);
    const avatar = screen.getByRole('img', { name: 'Ana Pérez' });
    expect(photoOf(container)).toHaveAttribute('src', PHOTO);
    expect(photoOf(container)).toHaveAttribute('alt', '');
    expect(avatar).not.toHaveTextContent('AP');
  });

  it('si la foto no carga (URL vencida) vuelve a las iniciales', () => {
    const { container } = render(<Avatar name="Ana Pérez" src={PHOTO} />);
    fireEvent.error(photoOf(container));
    expect(photoOf(container)).toBeNull();
    expect(screen.getByRole('img', { name: 'Ana Pérez' })).toHaveTextContent('AP');
  });

  it('con un src nuevo después del error vuelve a intentar con la foto', () => {
    const { container, rerender } = render(<Avatar name="Ana Pérez" src={PHOTO} />);
    fireEvent.error(photoOf(container));
    rerender(<Avatar name="Ana Pérez" src={NEW_PHOTO} />);
    expect(photoOf(container)).toHaveAttribute('src', NEW_PHOTO);
  });

  it('sin src muestra las iniciales como siempre', () => {
    const { container } = render(<Avatar name="Ana Pérez" src={null} />);
    expect(photoOf(container)).toBeNull();
    expect(screen.getByRole('img', { name: 'Ana Pérez' })).toHaveTextContent('AP');
  });
});
