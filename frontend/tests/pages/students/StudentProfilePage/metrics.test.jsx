import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { metric, studentDetail } from '../../../helpers/students/fixtures';
import { loadProfile } from '../../../helpers/students/profile';

// jsdom no mide el layout: ResponsiveContainer renderiza 0×0 (y avisa por consola).
// Se lo reemplaza por un contenedor de tamaño fijo que le pasa width/height al gráfico.
vi.mock('recharts', async (importOriginal) => {
  const { cloneElement } = await import('react');
  return {
    ...(await importOriginal()),
    ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 240 }),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const main = () => within(screen.getByRole('main'));

const METRICS = () => [
  metric({ recorded_at: '2026-08-05T12:00:00Z', weight_kg: 82, waist_cm: 95 }),
  metric({ recorded_at: '2026-09-05T12:00:00Z', weight_kg: 81, body_fat_pct: 20 }),
  metric({ recorded_at: '2026-10-05T12:00:00Z', weight_kg: 80, waist_cm: 90 }),
];

describe('StudentProfilePage: gráfico e historial de medidas', () => {
  it('con dos o más pesos dibuja el gráfico', async () => {
    await loadProfile({ detail: studentDetail(), metrics: METRICS() });
    expect(await main().findByRole('img', { name: 'Evolución del peso' })).toBeInTheDocument();
    expect(main().queryByText(/Cargá al menos dos pesos/)).not.toBeInTheDocument();
  });

  it('con un solo peso muestra el texto en lugar del gráfico', async () => {
    await loadProfile({ detail: studentDetail(), metrics: [metric()] });
    expect(await main().findByText('Cargá al menos dos pesos para ver la evolución')).toBeVisible();
    expect(main().queryByRole('img', { name: 'Evolución del peso' })).not.toBeInTheDocument();
  });

  it('el historial va de la más nueva a la más vieja', async () => {
    await loadProfile({ detail: studentDetail(), metrics: METRICS() });
    const table = await main().findByRole('table', { name: 'Historial de medidas' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual([
      '05/10/2026',
      '05/09/2026',
      '05/08/2026',
    ]);
    expect(within(rows[1]).getByText('20 %')).toBeVisible();
  });

  it('cada fila tiene su botón de borrar', async () => {
    await loadProfile({ detail: studentDetail(), metrics: METRICS() });
    expect(await main().findByRole('button', { name: 'Borrar medida del 05/10/2026' })).toBeVisible();
  });
});
