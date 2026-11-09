import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileHeader from '@/components/students/profile/ProfileHeader';
import { studentDetail } from '../../../helpers/students/fixtures';

const NOW = new Date('2026-11-09T12:00:00');
const show = (overrides) => render(<ProfileHeader student={studentDetail(overrides)} now={NOW} />);

describe('ProfileHeader: teléfono y foto', () => {
  it('con teléfono lo muestra con link a WhatsApp', () => {
    show({ phone: '+54 9 11 2233-4455' });
    const link = screen.getByRole('link', { name: 'Escribir por WhatsApp a +54 9 11 2233-4455' });
    expect(link).toHaveAttribute('href', 'https://wa.me/5491122334455');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('+54 9 11 2233-4455');
  });

  it('un teléfono sin dígitos suficientes se ve como texto, sin link', () => {
    show({ phone: '(--)' });
    expect(screen.getByText('(--)')).toBeVisible();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('sin teléfono no muestra nada', () => {
    const { container } = show({ phone: null });
    expect(screen.queryByRole('link')).toBeNull();
    expect(container.querySelector('svg.lucide-phone')).toBeNull();
  });

  it('con foto la muestra en el avatar', () => {
    const { container } = show({ avatar_url: 'https://storage.test/s.jpg' });
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://storage.test/s.jpg');
  });
});
