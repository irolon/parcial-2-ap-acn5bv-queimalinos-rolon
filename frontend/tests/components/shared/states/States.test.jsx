import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dumbbell } from 'lucide-react';
import LoadingState from '@/components/shared/states/LoadingState';
import ErrorState from '@/components/shared/states/ErrorState';
import EmptyState from '@/components/shared/states/EmptyState';

describe('LoadingState', () => {
  it('renderiza la cantidad de filas pedida', () => {
    render(<LoadingState rows={4} />);
    expect(screen.getAllByTestId('skeleton-row')).toHaveLength(4);
  });
});

describe('ErrorState', () => {
  it('llama onRetry al tocar Reintentar', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('sin onRetry no muestra el botón', () => {
    render(<ErrorState message="Falló" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('muestra título y texto con ícono propio', () => {
    render(<EmptyState icon={Dumbbell} title="Sin ejercicios" text="Agregá uno" />);
    expect(screen.getByText('Sin ejercicios')).toBeInTheDocument();
    expect(screen.getByText('Agregá uno')).toBeInTheDocument();
  });
});
