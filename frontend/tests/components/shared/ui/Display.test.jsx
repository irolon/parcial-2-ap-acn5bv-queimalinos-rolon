import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Pill from '@/components/shared/ui/Pill';
import Card from '@/components/shared/ui/Card';
import Avatar from '@/components/shared/ui/Avatar';
import Stat from '@/components/shared/ui/Stat';

describe('Pill', () => {
  it('aplica tono y tamaño', () => {
    render(<Pill tone="hot" size="md">Alta</Pill>);
    expect(screen.getByText('Alta')).toHaveClass('text-hot', 'h-[26px]', 'rounded-pill');
  });
});

describe('Card', () => {
  it('muestra título, extra y contenido', () => {
    render(<Card title="Hoy" extra={<span>ver</span>}>cuerpo</Card>);
    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByText('ver')).toBeInTheDocument();
    expect(screen.getByText('cuerpo')).toBeInTheDocument();
  });
});

describe('Avatar', () => {
  it('muestra las iniciales (máximo 2) y el indicador online', () => {
    render(<Avatar name="Tomás Pérez Gómez" online />);
    expect(screen.getByRole('img', { name: 'Tomás Pérez Gómez' })).toHaveTextContent('TP');
    expect(screen.getByTestId('avatar-online')).toBeInTheDocument();
  });

  it('tono hot', () => {
    render(<Avatar name="Ana" tone="hot" />);
    expect(screen.getByRole('img')).toHaveClass('text-hot');
  });
});

describe('Stat', () => {
  it('muestra valor, unidad y delta con color según signo', () => {
    const { rerender } = render(<Stat label="Peso" value="72" unit="kg" delta="+1.2" />);
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
    expect(screen.getByText('+1.2')).toHaveClass('text-good');
    rerender(<Stat label="Peso" value="72" delta="-1.2" accent big />);
    expect(screen.getByText('-1.2')).toHaveClass('text-hot');
    expect(screen.getByText('72')).toHaveClass('text-accentText', 'text-[40px]');
  });
});
