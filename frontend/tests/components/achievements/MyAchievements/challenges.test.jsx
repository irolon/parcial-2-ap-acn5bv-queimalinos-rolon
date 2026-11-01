import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { assignment } from '../../../helpers/achievements/gamification';
import { block, renderMine } from '../../../helpers/achievements/renderMine';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('MyAchievements: Tus desafíos', () => {
  it('el desafío activo va con su meta, su barra y la fecha en que termina', async () => {
    renderMine({ challenges: [assignment('a', 'Mes de fuerza', 'active', { progress_pct: 40 })] });
    const desafios = block('Tus desafíos');
    expect(await desafios.findByText('Mes de fuerza')).toBeVisible();
    expect(desafios.getByText('12 sesiones')).toBeVisible();
    expect(desafios.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(desafios.getByText('termina el 31/10')).toBeVisible();
  });

  it('el historial va plegado y se abre con "Historial (N)"', async () => {
    renderMine({
      challenges: [
        assignment('a', 'Activo', 'active'),
        assignment('h', 'Terminado', 'completed'),
        assignment('f', 'Vencido por tiempo', 'failed'),
      ],
    });
    const desafios = block('Tus desafíos');
    await desafios.findByText('Activo');
    expect(desafios.queryByText('Terminado')).toBeNull();
    fireEvent.click(desafios.getByRole('button', { name: 'Historial (2)' }));
    expect(desafios.getByText('Terminado')).toBeVisible();
    expect(desafios.getByText('Completado')).toBeVisible();
    expect(desafios.getByText('Vencido por tiempo')).toBeVisible();
    expect(desafios.getByText('Vencido')).toBeVisible();
  });

  it('sin desafíos dice que no tenés desafíos activos', async () => {
    renderMine({ challenges: [] });
    expect(await block('Tus desafíos').findByText('No tenés desafíos activos')).toBeVisible();
  });

  it('con solo historial también dice que no tenés activos, y deja abrir el historial', async () => {
    renderMine({ challenges: [assignment('h', 'Terminado', 'completed')] });
    const desafios = block('Tus desafíos');
    expect(await desafios.findByText('No tenés desafíos activos')).toBeVisible();
    expect(desafios.getByRole('button', { name: 'Historial (1)' })).toBeVisible();
  });

  it('el alumno no tiene acciones del entrenador: no asigna, no crea ni borra desafíos', async () => {
    renderMine({ challenges: [assignment('a', 'Activo', 'active'), assignment('h', 'Terminado', 'completed')] });
    await block('Tus desafíos').findByText('Activo');
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Historial (1)']);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /asignar|crear|borrar|eliminar/i })).toBeNull();
  });
});
