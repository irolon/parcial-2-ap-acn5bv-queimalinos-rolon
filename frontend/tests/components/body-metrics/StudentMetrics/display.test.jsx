import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import StudentMetrics from '@/components/body-metrics/StudentMetrics';
import { allowSlowScreens } from '../../../helpers/student/patience';
import { metric } from '../../../helpers/students/fixtures';
import { renderOwn, stubSelf } from '../../../helpers/students/self';

// jsdom no mide el layout: ResponsiveContainer renderiza 0×0. Se lo reemplaza por un contenedor de tamaño fijo.
vi.mock('recharts', async (importOriginal) => {
  const { cloneElement } = await import('react');
  return {
    ...(await importOriginal()),
    ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 240 }),
  };
});

allowSlowScreens();

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const BY_TRAINER = metric({ id: 'm-pt', recorded_at: '2026-09-05T12:00:00Z', weight_kg: 82, bmi: 25.9, recorded_by: 'trainer' });
const BY_STUDENT = metric({ id: 'm-st', recorded_at: '2026-10-05T12:00:00Z', weight_kg: 80.5, bmi: 25.4, recorded_by: 'student' });

function show(metrics) {
  stubSelf({ metrics });
  renderOwn(<StudentMetrics studentId="s-1" />);
}

const history = () => screen.findByRole('table', { name: 'Historial de medidas' });
const deleteButtons = () => screen.queryAllByRole('button', { name: /^Borrar medida/ });

describe('StudentMetrics: las medidas', () => {
  it('muestra "Medidas actuales" con el último valor de cada campo y el botón Registrar medición', async () => {
    show([BY_TRAINER, BY_STUDENT]);
    const card = (await screen.findByText('Medidas actuales')).closest('div[class*="rounded-xl"]');
    expect(within(card).getByText('Peso').nextElementSibling).toHaveTextContent('80,5');
    expect(within(card).getByText('−1,5 kg')).toBeVisible();
    expect(within(card).getByRole('button', { name: 'Registrar medición' })).toBeVisible();
    expect(screen.queryByText('Antropometría')).toBeNull();
  });

  it('dibuja la evolución del peso con dos o más pesos', async () => {
    show([BY_TRAINER, BY_STUDENT]);
    const chart = await screen.findByRole('img', { name: 'Evolución del peso' });
    await waitFor(() => expect(chart.querySelectorAll('.recharts-line-dot')).toHaveLength(2));
  });

  it('con un solo peso lo avisa en lugar del gráfico', async () => {
    show([BY_STUDENT]);
    expect(await screen.findByText('Cargá al menos dos pesos para ver la evolución')).toBeVisible();
    expect(screen.queryByRole('img', { name: 'Evolución del peso' })).toBeNull();
  });

  it('el historial va de la más nueva a la más vieja', async () => {
    show([BY_TRAINER, BY_STUDENT]);
    const rows = within(await history()).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual(['05/10/2026', '05/09/2026']);
  });
});

describe('StudentMetrics: qué puede borrar el alumno', () => {
  it('la ✕ está solo en las medidas que cargó él', async () => {
    show([BY_TRAINER, BY_STUDENT]);
    const table = await history();
    expect(within(table).getByRole('button', { name: 'Borrar medida del 05/10/2026' })).toBeVisible();
    expect(within(table).queryByRole('button', { name: 'Borrar medida del 05/09/2026' })).toBeNull();
    expect(deleteButtons()).toHaveLength(1);
  });

  it('si todas las cargó su entrenador (o no dicen quién) no ofrece borrar ninguna ni muestra la columna', async () => {
    const withoutAuthor = metric({ id: 'm-old', recorded_at: '2026-08-05T12:00:00Z', weight_kg: 83 });
    show([withoutAuthor, BY_TRAINER]);
    const table = await history();
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(deleteButtons()).toHaveLength(0);
    expect(within(table).queryByRole('columnheader', { name: 'Acciones' })).toBeNull();
  });
});
