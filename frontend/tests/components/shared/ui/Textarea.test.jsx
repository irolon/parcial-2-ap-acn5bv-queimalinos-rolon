import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Textarea from '@/components/shared/ui/Textarea';

describe('Textarea', () => {
  it('asocia la etiqueta con el campo', () => {
    render(<Textarea label="Descripción" />);
    expect(screen.getByLabelText('Descripción').tagName).toBe('TEXTAREA');
  });

  it('muestra el error con role alert y aria-invalid', () => {
    render(<Textarea label="Descripción" error="Demasiado larga" />);
    const field = screen.getByLabelText('Descripción');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Demasiado larga');
    expect(screen.getByRole('alert')).toHaveTextContent('Demasiado larga');
  });

  it('muestra la pista y no marca error', () => {
    render(<Textarea label="Descripción" hint="Hasta 1000 caracteres" />);
    expect(screen.getByLabelText('Descripción')).toHaveAccessibleDescription('Hasta 1000 caracteres');
    expect(screen.getByLabelText('Descripción')).not.toHaveAttribute('aria-invalid');
  });
});
