import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import MetricFormDialog from '@/components/body-metrics/dialogs/MetricFormDialog';
import { renderWithQuery } from '../../../helpers/progress/progress';

describe('MetricFormDialog: título', () => {
  it('se titula "Cargar medida" por defecto, como en la ficha del entrenador', () => {
    renderWithQuery(<MetricFormDialog studentId="s-1" onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Cargar medida' })).toBeVisible();
  });

  it('toma el título que le pasan, y deja de decir "Cargar medida"', () => {
    renderWithQuery(<MetricFormDialog studentId="s-1" title="Registrar medición" onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Registrar medición' })).toBeVisible();
    expect(screen.queryByRole('dialog', { name: 'Cargar medida' })).toBeNull();
  });
});
