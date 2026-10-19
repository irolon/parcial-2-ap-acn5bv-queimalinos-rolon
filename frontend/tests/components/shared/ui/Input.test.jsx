import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Input from '@/components/shared/ui/Input';

describe('Input', () => {
  it('asocia la etiqueta con el campo', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('muestra el error asociado vía aria-describedby', () => {
    render(<Input label="Email" id="email" error="Email inválido" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Email inválido');
    expect(screen.getByRole('alert')).toHaveTextContent('Email inválido');
  });

  it('estilos por defecto según el prototipo', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toHaveClass('rounded-md', 'bg-ink1', 'border-ink3');
  });

  it('con error usa borde hot', () => {
    render(<Input label="Email" error="x" />);
    expect(screen.getByLabelText('Email')).toHaveClass('border-hot');
  });

  it('sin error no hay aria-describedby ni alerta', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
