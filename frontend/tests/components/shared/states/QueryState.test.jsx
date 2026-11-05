import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QueryState from '@/components/shared/states/QueryState';

const renderQuery = (query, props = {}) =>
  render(
    <QueryState query={query} {...props}>
      {(data) => <div>datos: {data.join(',')}</div>}
    </QueryState>,
  );

describe('QueryState', () => {
  it('isPending muestra el skeleton', () => {
    renderQuery({ isPending: true, isError: false });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('isError muestra el error y Reintentar llama a refetch', async () => {
    const refetch = vi.fn();
    renderQuery({ isPending: false, isError: true, error: new Error('boom'), refetch });
    expect(screen.getByText('boom')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('datos vacíos muestra el estado vacío', () => {
    renderQuery(
      { isPending: false, isError: false, data: [] },
      { empty: { title: 'Sin rutinas', text: 'Creá la primera' } },
    );
    expect(screen.getByText('Sin rutinas')).toBeInTheDocument();
    expect(screen.getByText('Creá la primera')).toBeInTheDocument();
  });

  it('con datos renderiza children(data)', () => {
    renderQuery({ isPending: false, isError: false, data: ['a', 'b'] });
    expect(screen.getByText('datos: a,b')).toBeInTheDocument();
  });

  it('un refetch fallido que conserva los datos no los tapa con el error', () => {
    renderQuery({ isPending: false, isError: true, error: new Error('boom'), data: ['a', 'b'], refetch: vi.fn() });
    expect(screen.getByText('datos: a,b')).toBeInTheDocument();
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
