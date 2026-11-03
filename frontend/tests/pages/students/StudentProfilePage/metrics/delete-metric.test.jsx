import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jsonResponse } from '../../../../helpers/shared/fetchMock';
import { metric, studentDetail } from '../../../../helpers/students/fixtures';
import { callsWith, loadProfile } from '../../../../helpers/students/profile';

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

describe('StudentProfilePage: borrar medida', () => {
  it('confirma, hace DELETE y recarga el historial', async () => {
    const user = userEvent.setup();
    let rows = [metric({ id: 'm-a', recorded_at: '2026-10-05T12:00:00Z', weight_kg: 80 })];
    const deleteMetric = vi.fn(async () => {
      rows = [];
      return jsonResponse(204);
    });
    const { fetchMock } = await loadProfile({
      detail: studentDetail(),
      metrics: () => rows,
      handlers: { deleteMetric },
    });
    await user.click(await screen.findByRole('button', { name: 'Borrar medida del 05/10/2026' }));
    const dialog = await screen.findByRole('dialog', { name: '¿Borrar la medida del 05/10/2026?' });
    expect(callsWith(fetchMock, 'DELETE')).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Borrar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(callsWith(fetchMock, 'DELETE').map(([path]) => path)).toEqual(['/students/st-1/metrics/m-a']);
    expect(await screen.findByText('El historial está vacío')).toBeVisible();
  });

  it('cancelar no borra nada', async () => {
    const user = userEvent.setup();
    const { fetchMock } = await loadProfile({ detail: studentDetail(), metrics: [metric({ id: 'm-a' })] });
    await user.click(await screen.findByRole('button', { name: /Borrar medida del/ }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(callsWith(fetchMock, 'DELETE')).toHaveLength(0);
  });
});
