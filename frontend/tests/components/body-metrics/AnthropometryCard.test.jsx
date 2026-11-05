import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnthropometryCard from '@/components/body-metrics/AnthropometryCard';
import { metric } from '../../helpers/students/fixtures';

const METRICS = [
  metric({ recorded_at: '2026-09-05T12:00:00Z', weight_kg: 82, bmi: 25.9 }),
  metric({ recorded_at: '2026-10-05T12:00:00Z', weight_kg: 80.5, bmi: 25.4, waist_cm: 90 }),
];

describe('AnthropometryCard', () => {
  it('se llama "Antropometría" salvo que la pantalla le ponga otro título', () => {
    const { rerender } = render(<AnthropometryCard metrics={METRICS} />);
    expect(screen.getByText('Antropometría')).toBeVisible();
    rerender(<AnthropometryCard metrics={METRICS} title="Medidas actuales" />);
    expect(screen.getByText('Medidas actuales')).toBeVisible();
    expect(screen.queryByText('Antropometría')).toBeNull();
  });

  it('muestra el último valor de cada campo con la diferencia contra el anterior', () => {
    render(<AnthropometryCard metrics={METRICS} title="Medidas actuales" />);
    expect(screen.getByText('80,5')).toBeVisible();
    expect(screen.getByText('−1,5 kg')).toBeVisible();
    expect(screen.getByText('90')).toBeVisible();
  });

  it('lleva la acción que le pasa la pantalla al lado del título', () => {
    render(<AnthropometryCard metrics={METRICS} title="Medidas actuales" extra={<button type="button">Registrar medición</button>} />);
    expect(screen.getByRole('button', { name: 'Registrar medición' })).toBeVisible();
  });
});
