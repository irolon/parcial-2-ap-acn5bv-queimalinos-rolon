import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { calls, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { DEFAULT_DATA } from '../../../helpers/achievements/gamification';
import { block, renderMine } from '../../../helpers/achievements/renderMine';
import { allowSlowScreens } from '../../../helpers/student/patience';

allowSlowScreens();

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// título del bloque, qué pide el stub, el final de su dirección, su texto de carga y su texto de error
const BLOCKS = [
  ['Tu racha', 'streak', '/streak', 'Cargando tu racha…', 'No pudimos cargar tu racha.'],
  ['Tus logros', 'progress', '/achievements/progress', 'Cargando tus logros…', 'No pudimos cargar tus logros.'],
  ['Tus desafíos', 'challenges', '/challenges', 'Cargando tus desafíos…', 'No pudimos cargar tus desafíos.'],
];

describe.each(BLOCKS)('MyAchievements: %s', (title, key, suffix, loading, failure) => {
  it('mientras carga muestra su carga y los demás bloques no esperan', async () => {
    renderMine({ [key]: () => new Promise(() => {}) });
    expect(block(title).getByRole('status')).toHaveTextContent(loading);
    await waitFor(() => expect(screen.getAllByRole('status')).toHaveLength(1));
    expect(block(title).getByRole('status')).toHaveTextContent(loading);
  });

  it('si falla muestra su aviso con Reintentar sin tapar a los demás, y Reintentar lo vuelve a pedir', async () => {
    let failing = true;
    const fetchMock = renderMine({
      [key]: () => (failing ? errorResponse(500, 'INTERNAL', 'Falló la base') : jsonResponse(200, { data: DEFAULT_DATA[key] })),
    });
    const alert = await block(title).findByRole('alert');
    expect(alert).toHaveTextContent(failure);
    expect(alert).not.toHaveTextContent('Falló la base');
    await waitFor(() => expect(screen.queryAllByRole('status')).toHaveLength(0));
    expect(screen.getAllByRole('alert')).toHaveLength(1);

    failing = false;
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(calls(fetchMock).filter(([path]) => path.endsWith(suffix) && path.startsWith('/students/s-1'))).toHaveLength(2);
  });
});

describe('MyAchievements: estados juntos', () => {
  it('con los tres bloques fallando, cada uno tiene su propio Reintentar', async () => {
    const failing = () => errorResponse(500, 'INTERNAL');
    renderMine({ streak: failing, progress: failing, challenges: failing });
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(3));
    expect(screen.getAllByRole('button', { name: 'Reintentar' })).toHaveLength(3);
  });

  it('un bloque que falla no cambia lo que muestran los otros', async () => {
    renderMine({ progress: () => errorResponse(500, 'INTERNAL'), challenges: [] });
    expect(await block('Tu racha').findByText('Racha actual 6 días · Récord 9 días')).toBeVisible();
    expect(await block('Tus desafíos').findByText('No tenés desafíos activos')).toBeVisible();
    expect(await block('Tus logros').findByRole('alert')).toHaveTextContent('No pudimos cargar tus logros.');
  });
});
