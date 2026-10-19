import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Select from '@/components/shared/ui/Select';

const OPTIONS = [
  { value: '', label: 'Sin definir' },
  { value: 'tonify', label: 'Tonificar' },
];

describe('Select', () => {
  it('asocia la etiqueta y muestra las opciones', () => {
    render(<Select label="Objetivo" options={OPTIONS} />);
    const select = screen.getByLabelText('Objetivo');
    expect(select).toBeInTheDocument();
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Sin definir',
      'Tonificar',
    ]);
  });

  it('permite elegir una opción', async () => {
    render(<Select label="Objetivo" options={OPTIONS} />);
    await userEvent.setup().selectOptions(screen.getByLabelText('Objetivo'), 'tonify');
    expect(screen.getByLabelText('Objetivo')).toHaveValue('tonify');
  });

  it('muestra el error asociado vía aria-describedby y borde hot', () => {
    render(<Select label="Nivel" options={OPTIONS} error="Nivel inválido" />);
    const select = screen.getByLabelText('Nivel');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAccessibleDescription('Nivel inválido');
    expect(select).toHaveClass('border-hot');
    expect(screen.getByRole('alert')).toHaveTextContent('Nivel inválido');
  });

  it('estilos por defecto según el prototipo y sin error accesible', () => {
    render(<Select label="Nivel" options={OPTIONS} />);
    const select = screen.getByLabelText('Nivel');
    expect(select).toHaveClass('rounded-md', 'bg-ink1', 'border-ink3');
    expect(select).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
