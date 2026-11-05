import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AchievementBlock from '@/components/achievements/AchievementBlock';

const query = (overrides) => ({ isPending: false, isError: false, data: undefined, refetch: vi.fn(), ...overrides });

describe('AchievementBlock', () => {
  it('con datos muestra el título y lo que dibuja children con ellos', () => {
    render(
      <AchievementBlock title="Racha" query={query({ data: { days: 12 } })}>
        {(data) => <p>{data.days} días</p>}
      </AchievementBlock>,
    );
    expect(screen.getByRole('heading', { name: 'Racha' })).toBeVisible();
    expect(screen.getByText('12 días')).toBeVisible();
  });

  it('mientras carga muestra su carga, con el texto por defecto o con el que le piden, y no dibuja children', () => {
    const children = vi.fn(() => <p>contenido</p>);
    const { rerender } = render(
      <AchievementBlock title="Racha" query={query({ isPending: true })}>
        {children}
      </AchievementBlock>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
    rerender(
      <AchievementBlock title="Racha" query={query({ isPending: true })} loadingLabel="Cargando tu racha…">
        {children}
      </AchievementBlock>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tu racha…');
    expect(children).not.toHaveBeenCalled();
  });

  it('si falla muestra el mensaje del servidor, o el que le piden, y Reintentar vuelve a pedirlo', () => {
    const refetch = vi.fn();
    const failing = query({ isError: true, error: { message: 'Falló el servidor' }, refetch });
    const { rerender } = render(
      <AchievementBlock title="Racha" query={failing}>
        {() => null}
      </AchievementBlock>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Falló el servidor');
    rerender(
      <AchievementBlock title="Racha" query={failing} errorMessage="No pudimos cargar tu racha.">
        {() => null}
      </AchievementBlock>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar tu racha.');
    expect(screen.queryByText('Falló el servidor')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('un refetch fallido que conserva los datos los sigue mostrando, sin el error', () => {
    render(
      <AchievementBlock title="Tus logros" query={query({ isError: true, error: { message: 'boom' }, data: { days: 12 } })}>
        {(data) => <p>{data.days} días</p>}
      </AchievementBlock>,
    );
    expect(screen.getByText('12 días')).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
