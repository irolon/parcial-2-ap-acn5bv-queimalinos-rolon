import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MetricSelector from '@/components/progress/MetricSelector';

const options = [
  { value: 'e1rm_kg', label: '1RM estimado', disabled: true },
  { value: 'reps', label: 'Repeticiones' },
];

describe('MetricSelector', () => {
  it('es un grupo de botones con aria-pressed', () => {
    render(<MetricSelector value="reps" options={options} onChange={() => {}} />);
    expect(screen.getByRole('group', { name: 'Métrica' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Repeticiones' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '1RM estimado' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('la opción deshabilitada no dispara onChange', () => {
    const onChange = vi.fn();
    render(<MetricSelector value="reps" options={options} onChange={onChange} />);
    const disabled = screen.getByRole('button', { name: '1RM estimado' });
    expect(disabled).toBeDisabled();
    expect(disabled).toHaveAttribute('title', 'Sin peso registrado');
    fireEvent.click(disabled);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('elegir una opción habilitada avisa', () => {
    const onChange = vi.fn();
    render(<MetricSelector value="e1rm_kg" options={options} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Repeticiones' }));
    expect(onChange).toHaveBeenCalledWith('reps');
  });
});
